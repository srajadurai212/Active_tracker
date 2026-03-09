"""
Seed script to create the initial admin user.
Usage: python seed.py
"""
import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User, UserRole
from app.core.security import hash_password
from app.config import settings


async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"Admin user already exists: {settings.ADMIN_EMAIL}")
            return

        admin = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            full_name=settings.ADMIN_NAME,
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Created admin user: {settings.ADMIN_EMAIL}")


if __name__ == "__main__":
    asyncio.run(seed())
