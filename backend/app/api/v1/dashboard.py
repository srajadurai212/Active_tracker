from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user, get_admin_user
from app.db.models import Activity, User, ActivityStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ── Response schemas ──────────────────────────────────────────────────────────

class UserCountItem(BaseModel):
    id: str
    name: str
    count: int


class ResourceCompletionItem(BaseModel):
    id: str
    name: str
    total: int
    open: int
    in_progress: int
    completed: int
    closed: int


class OverdueActivityItem(BaseModel):
    id: str
    client_name: str
    action_item: str
    assigned_to_id: Optional[str]
    assigned_to_name: Optional[str]
    status: str
    target_closure_date: str
    days_overdue: int


class RecentActivityItem(BaseModel):
    id: str
    client_name: str
    action_item: str
    assigned_to_id: Optional[str]
    assigned_to_name: Optional[str]
    status: str
    target_closure_date: Optional[str]
    created_at: str


class TypeCountItem(BaseModel):
    label: str
    count: int


class AdminDashboardStats(BaseModel):
    total: int
    open: int
    in_progress: int
    closed: int
    completed: int
    on_hold: int
    overdue: int
    top_overdue_by_user: list[UserCountItem]
    top_pending_by_user: list[UserCountItem]
    type_breakdown: list[TypeCountItem]
    domain_breakdown: list[TypeCountItem]
    resource_completion: list[ResourceCompletionItem]
    overdue_list: list[OverdueActivityItem]
    recent: list[RecentActivityItem]


class UpcomingActivityItem(BaseModel):
    id: str
    client_name: str
    action_item: str
    status: str
    target_closure_date: str


class UserDashboardStats(BaseModel):
    total: int
    by_status: dict[str, int]
    pending: int
    done: int
    overdue: int
    completion_pct: int
    type_breakdown: list[TypeCountItem]
    upcoming: list[UpcomingActivityItem]
    overdue_list: list[OverdueActivityItem]


# ── Admin dashboard ───────────────────────────────────────────────────────────

@router.get("/admin", response_model=AdminDashboardStats)
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    today = date.today()

    # 1. Status counts
    status_rows = (await db.execute(
        select(Activity.status, func.count().label("cnt"))
        .where(Activity.deleted_at.is_(None))
        .group_by(Activity.status)
    )).all()

    status_map: dict[str, int] = {r.status: r.cnt for r in status_rows}
    total = sum(status_map.values())

    # 2. Overdue count (not Closed, past target date)
    overdue_count: int = (await db.execute(
        select(func.count())
        .where(
            Activity.deleted_at.is_(None),
            Activity.status != ActivityStatus.closed,
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date < today,
        )
    )).scalar_one()

    # 3. Top overdue by user (top 7)
    overdue_user_rows = (await db.execute(
        select(
            Activity.assigned_to_id,
            User.full_name,
            func.count().label("cnt"),
        )
        .outerjoin(User, Activity.assigned_to_id == User.id)
        .where(
            Activity.deleted_at.is_(None),
            Activity.status != ActivityStatus.closed,
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date < today,
        )
        .group_by(Activity.assigned_to_id, User.full_name)
        .order_by(func.count().desc())
        .limit(7)
    )).all()

    top_overdue_by_user = [
        UserCountItem(
            id=str(r.assigned_to_id) if r.assigned_to_id else "__unassigned__",
            name=r.full_name or "Unassigned",
            count=r.cnt,
        )
        for r in overdue_user_rows
    ]

    # 4. Top pending by user (Open + In Progress, top 7)
    pending_user_rows = (await db.execute(
        select(
            Activity.assigned_to_id,
            User.full_name,
            func.count().label("cnt"),
        )
        .outerjoin(User, Activity.assigned_to_id == User.id)
        .where(
            Activity.deleted_at.is_(None),
            Activity.status.in_([ActivityStatus.open, ActivityStatus.in_progress]),
        )
        .group_by(Activity.assigned_to_id, User.full_name)
        .order_by(func.count().desc())
        .limit(7)
    )).all()

    top_pending_by_user = [
        UserCountItem(
            id=str(r.assigned_to_id) if r.assigned_to_id else "__unassigned__",
            name=r.full_name or "Unassigned",
            count=r.cnt,
        )
        for r in pending_user_rows
    ]

    # 5. Type breakdown
    type_rows = (await db.execute(
        select(
            func.coalesce(Activity.activity_type, "Other").label("label"),
            func.count().label("cnt"),
        )
        .where(Activity.deleted_at.is_(None))
        .group_by(Activity.activity_type)
        .order_by(func.count().desc())
    )).all()

    type_breakdown = [TypeCountItem(label=r.label, count=r.cnt) for r in type_rows]

    # 6. Domain breakdown (top 8)
    domain_rows = (await db.execute(
        select(
            func.coalesce(Activity.product_domain, "Unknown").label("label"),
            func.count().label("cnt"),
        )
        .where(Activity.deleted_at.is_(None))
        .group_by(Activity.product_domain)
        .order_by(func.count().desc())
        .limit(8)
    )).all()

    domain_breakdown = [TypeCountItem(label=r.label, count=r.cnt) for r in domain_rows]

    # 7. Resource completion (users with >= 2 activities)
    resource_rows = (await db.execute(
        select(
            Activity.assigned_to_id,
            User.full_name,
            func.count().label("total"),
            func.count(case((Activity.status == ActivityStatus.open, 1))).label("open"),
            func.count(case((Activity.status == ActivityStatus.in_progress, 1))).label("in_progress"),
            func.count(case((Activity.status == ActivityStatus.completed, 1))).label("completed"),
            func.count(case((Activity.status == ActivityStatus.closed, 1))).label("closed"),
        )
        .outerjoin(User, Activity.assigned_to_id == User.id)
        .where(Activity.deleted_at.is_(None))
        .group_by(Activity.assigned_to_id, User.full_name)
        .having(func.count() >= 2)
        .order_by(func.count().desc())
    )).all()

    resource_completion = [
        ResourceCompletionItem(
            id=str(r.assigned_to_id) if r.assigned_to_id else "__unassigned__",
            name=r.full_name or "Unassigned",
            total=r.total,
            open=r.open,
            in_progress=r.in_progress,
            completed=r.completed,
            closed=r.closed,
        )
        for r in resource_rows
    ]

    # 8. Overdue list (top 8 most overdue, oldest target date first)
    overdue_list_rows = (await db.execute(
        select(
            Activity.id,
            Activity.client_name,
            Activity.action_item,
            Activity.assigned_to_id,
            User.full_name.label("assigned_to_name"),
            Activity.status,
            Activity.target_closure_date,
        )
        .outerjoin(User, Activity.assigned_to_id == User.id)
        .where(
            Activity.deleted_at.is_(None),
            Activity.status != ActivityStatus.closed,
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date < today,
        )
        .order_by(Activity.target_closure_date.asc())
        .limit(8)
    )).all()

    overdue_list = [
        OverdueActivityItem(
            id=str(r.id),
            client_name=r.client_name,
            action_item=r.action_item,
            assigned_to_id=str(r.assigned_to_id) if r.assigned_to_id else None,
            assigned_to_name=r.assigned_to_name,
            status=r.status,
            target_closure_date=r.target_closure_date.isoformat(),
            days_overdue=(today - r.target_closure_date).days,
        )
        for r in overdue_list_rows
    ]

    # 9. Recent activities (6 most recently created)
    recent_rows = (await db.execute(
        select(
            Activity.id,
            Activity.client_name,
            Activity.action_item,
            Activity.assigned_to_id,
            User.full_name.label("assigned_to_name"),
            Activity.status,
            Activity.target_closure_date,
            Activity.created_at,
        )
        .outerjoin(User, Activity.assigned_to_id == User.id)
        .where(Activity.deleted_at.is_(None))
        .order_by(Activity.created_at.desc())
        .limit(6)
    )).all()

    recent = [
        RecentActivityItem(
            id=str(r.id),
            client_name=r.client_name,
            action_item=r.action_item,
            assigned_to_id=str(r.assigned_to_id) if r.assigned_to_id else None,
            assigned_to_name=r.assigned_to_name,
            status=r.status,
            target_closure_date=r.target_closure_date.isoformat() if r.target_closure_date else None,
            created_at=r.created_at.isoformat(),
        )
        for r in recent_rows
    ]

    return AdminDashboardStats(
        total=total,
        open=status_map.get("Open", 0),
        in_progress=status_map.get("In Progress", 0),
        closed=status_map.get("Closed", 0),
        completed=status_map.get("Completed", 0),
        on_hold=status_map.get("On-Hold", 0),
        overdue=overdue_count,
        top_overdue_by_user=top_overdue_by_user,
        top_pending_by_user=top_pending_by_user,
        type_breakdown=type_breakdown,
        domain_breakdown=domain_breakdown,
        resource_completion=resource_completion,
        overdue_list=overdue_list,
        recent=recent,
    )


# ── User dashboard ────────────────────────────────────────────────────────────

@router.get("/user", response_model=UserDashboardStats)
async def user_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    user_id = current_user.id

    # 1. Status counts for this user
    status_rows = (await db.execute(
        select(Activity.status, func.count().label("cnt"))
        .where(
            Activity.deleted_at.is_(None),
            Activity.assigned_to_id == user_id,
        )
        .group_by(Activity.status)
    )).all()

    by_status: dict[str, int] = {r.status: r.cnt for r in status_rows}
    total = sum(by_status.values())
    pending = by_status.get("Open", 0) + by_status.get("In Progress", 0)
    done = by_status.get("Closed", 0) + by_status.get("Completed", 0)
    completion_pct = round(done * 100 / total) if total > 0 else 0

    # 2. Overdue count (not Closed/Completed)
    overdue_count: int = (await db.execute(
        select(func.count())
        .where(
            Activity.deleted_at.is_(None),
            Activity.assigned_to_id == user_id,
            Activity.status.notin_([ActivityStatus.closed, ActivityStatus.completed]),
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date < today,
        )
    )).scalar_one()

    # 3. Type breakdown
    type_rows = (await db.execute(
        select(
            func.coalesce(Activity.activity_type, "Other").label("label"),
            func.count().label("cnt"),
        )
        .where(
            Activity.deleted_at.is_(None),
            Activity.assigned_to_id == user_id,
        )
        .group_by(Activity.activity_type)
        .order_by(func.count().desc())
    )).all()

    type_breakdown = [TypeCountItem(label=r.label, count=r.cnt) for r in type_rows]

    # 4. Upcoming (target date within next 14 days, not closed/completed)
    upcoming_rows = (await db.execute(
        select(
            Activity.id,
            Activity.client_name,
            Activity.action_item,
            Activity.status,
            Activity.target_closure_date,
        )
        .where(
            Activity.deleted_at.is_(None),
            Activity.assigned_to_id == user_id,
            Activity.status.notin_([ActivityStatus.closed, ActivityStatus.completed]),
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date >= today,
            Activity.target_closure_date <= today + timedelta(days=14),
        )
        .order_by(Activity.target_closure_date.asc())
    )).all()

    upcoming = [
        UpcomingActivityItem(
            id=str(r.id),
            client_name=r.client_name,
            action_item=r.action_item,
            status=r.status,
            target_closure_date=r.target_closure_date.isoformat(),
        )
        for r in upcoming_rows
    ]

    # 5. Overdue list (sorted by most overdue first)
    overdue_rows = (await db.execute(
        select(
            Activity.id,
            Activity.client_name,
            Activity.action_item,
            Activity.assigned_to_id,
            Activity.status,
            Activity.target_closure_date,
        )
        .where(
            Activity.deleted_at.is_(None),
            Activity.assigned_to_id == user_id,
            Activity.status.notin_([ActivityStatus.closed, ActivityStatus.completed]),
            Activity.target_closure_date.isnot(None),
            Activity.target_closure_date < today,
        )
        .order_by(Activity.target_closure_date.asc())
    )).all()

    overdue_list = [
        OverdueActivityItem(
            id=str(r.id),
            client_name=r.client_name,
            action_item=r.action_item,
            assigned_to_id=str(r.assigned_to_id) if r.assigned_to_id else None,
            assigned_to_name=None,
            status=r.status,
            target_closure_date=r.target_closure_date.isoformat(),
            days_overdue=(today - r.target_closure_date).days,
        )
        for r in overdue_rows
    ]

    return UserDashboardStats(
        total=total,
        by_status=by_status,
        pending=pending,
        done=done,
        overdue=overdue_count,
        completion_pct=completion_pct,
        type_breakdown=type_breakdown,
        upcoming=upcoming,
        overdue_list=overdue_list,
    )
