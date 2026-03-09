"""
Import real data from 'IZ - Leads Activity Tracker.xlsx'
- Creates one user per unique name found in 'Action On' column
- Shahrukh → admin role; everyone else → user role
- Default password for all: Welcome@123
- Maps activity records preserving all original data
"""
from __future__ import annotations

import asyncio
import re
import sys
import uuid
from datetime import date, datetime
from pathlib import Path

import openpyxl

# ── path so we can import app modules ──────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.core.security import hash_password as get_password_hash
from app.db.models import Activity, ActivityStatus, User, UserRole
from app.db.session import AsyncSessionLocal

# ── constants ──────────────────────────────────────────────────────────────────
EXCEL_PATH = Path("/Users/venkateshvaratharajan/IZ_Leads/IZ - Leads Activity Tracker.xlsx")
DEFAULT_PASSWORD = "Welcome@123"
SHEET_NAME = "Consolidated Activity Tracker"

# Normalise activity type variants from Excel to a canonical label
ACTIVITY_TYPE_MAP: dict[str, str] = {
    "follow up": "Follow Up",
    "follow-up": "Follow Up",
    "followup": "Follow Up",
    "resources": "Resource",
    "poc": "POC",
    "project support": "Support",
    "technical support": "Support",
    "project task/support": "Support",
    "offshore": "Offshore",
    "documentation": "Documentation",
    "project": "Project",
    "resource": "Resource",
    "proposal": "Proposal",
    "r&d": "R&D",
    "analysis": "Analysis",
    "support": "Support",
    "internal": "Internal",
    "effort estimation": "Effort Estimation",
    "knowledge transfer": "Knowledge Transfer",
    "training": "Training",
    "development": "Development",
    "testing": "Testing",
    "webinar": "Webinar",
    "cr": "CR",
    "audit": "Audit",
    "both": "Other",
}

STATUS_MAP: dict[str, ActivityStatus] = {
    "open": ActivityStatus.open,
    "in progress": ActivityStatus.in_progress,
    "closed": ActivityStatus.closed,
    "on-hold": ActivityStatus.on_hold,
    "on hold": ActivityStatus.on_hold,
}

# ── helpers ────────────────────────────────────────────────────────────────────

def normalise_name(raw: str) -> str:
    """Title-case, collapse spaces."""
    return " ".join(raw.strip().split()).title()


def extract_primary_name(action_on: str) -> str:
    """Return the first person's name from values like 'Ashik / Shakeel'."""
    # Split on /, comma, or 'and' (case-insensitive)
    parts = re.split(r"[/,]|\bAND\b", action_on, flags=re.IGNORECASE)
    return normalise_name(parts[0])


def map_activity_type(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower()
    return ACTIVITY_TYPE_MAP.get(key, raw.strip())


def map_status(raw: str | None) -> ActivityStatus:
    if not raw:
        return ActivityStatus.open
    key = raw.strip().lower()
    return STATUS_MAP.get(key, ActivityStatus.open)


def to_date(val) -> date | None:
    if val is None:
        return None
    if isinstance(val, (datetime,)):
        return val.date()
    if isinstance(val, date):
        return val
    return None


# ── main ───────────────────────────────────────────────────────────────────────

async def run() -> None:
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb[SHEET_NAME]

    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[0] is None:
            break
        rows.append(row)

    print(f"Found {len(rows)} data rows in Excel.")

    # ── Collect unique user names ──────────────────────────────────────────────
    raw_names: set[str] = set()
    for row in rows:
        action_on = row[4]
        if action_on and str(action_on).strip().upper() != "ALL":
            primary = extract_primary_name(str(action_on))
            if primary:
                raw_names.add(primary)

    print(f"\nUnique users to create ({len(raw_names)}):")
    for n in sorted(raw_names):
        role_label = "ADMIN" if n.lower() == "shahrukh" else "user"
        print(f"  {n:30s} [{role_label}]")

    async with AsyncSessionLocal() as session:
        # ── Check/create admin from env (if not already present) ──────────────
        from sqlalchemy import select

        # ── Create/upsert users ───────────────────────────────────────────────
        name_to_user: dict[str, User] = {}

        for name in sorted(raw_names):
            result = await session.execute(
                select(User).where(User.full_name == name)
            )
            existing = result.scalar_one_or_none()

            if existing:
                name_to_user[name] = existing
                print(f"  [skip] User already exists: {name}")
                continue

            email_part = name.lower().replace(" ", ".")
            email = f"{email_part}@izleads.local"
            role = UserRole.admin if name.lower() == "shahrukh" else UserRole.user

            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password=get_password_hash(DEFAULT_PASSWORD),
                full_name=name,
                role=role,
                is_active=True,
            )
            session.add(user)
            name_to_user[name] = user
            print(f"  [+] Created: {name:30s}  role={role.value}  email={email}")

        await session.flush()  # get IDs before creating activities

        # ── Also ensure the env-based admin exists ─────────────────────────────
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                id=uuid.uuid4(),
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name=settings.ADMIN_NAME,
                role=UserRole.admin,
                is_active=True,
            )
            session.add(admin)
            await session.flush()
            print(f"\n[+] Created env admin: {settings.ADMIN_EMAIL}")

        # ── Import activities ──────────────────────────────────────────────────
        print(f"\nImporting {len(rows)} activities …")
        skipped = 0
        imported = 0

        for i, row in enumerate(rows, start=1):
            # row indices: 0=sno, 1=client, 2=entry_date, 3=action_item,
            #              4=action_on, 5=product_domain, 6=activity_type,
            #              7=target_closure, 8=actual_closure, 9=status, 10=remarks
            client_name = str(row[1]).strip() if row[1] else None
            action_item = str(row[3]).strip() if row[3] else None

            if not client_name or not action_item:
                skipped += 1
                continue

            entry_date = to_date(row[2]) or date.today()

            action_on_raw = str(row[4]).strip() if row[4] else None
            assigned_user: User | None = None
            if action_on_raw and action_on_raw.upper() != "ALL":
                primary_name = extract_primary_name(action_on_raw)
                assigned_user = name_to_user.get(primary_name)

            activity = Activity(
                id=uuid.uuid4(),
                client_name=client_name,
                entry_date=entry_date,
                action_item=action_item,
                assigned_to_id=assigned_user.id if assigned_user else None,
                product_domain=str(row[5]).strip() if row[5] else None,
                activity_type=map_activity_type(str(row[6]) if row[6] else None),
                target_closure_date=to_date(row[7]),
                actual_closure_date=to_date(row[8]),
                status=map_status(str(row[9]) if row[9] else None),
                remarks=str(row[10]).strip() if row[10] else None,
                created_by_id=admin.id,
            )
            session.add(activity)
            imported += 1

            if i % 50 == 0:
                print(f"  … {i}/{len(rows)} processed")

        await session.commit()
        print(f"\nDone! Imported {imported} activities, skipped {skipped}.")
        print(f"\nDefault password for all users: {DEFAULT_PASSWORD}")
        print("Users can change their password after logging in.")


if __name__ == "__main__":
    asyncio.run(run())
