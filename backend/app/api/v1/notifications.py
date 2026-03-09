from __future__ import annotations
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.db.models import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import (
    get_user_notifications, mark_read, mark_all_read, delete_notification
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await get_user_notifications(db, current_user.id, unread_only=unread_only)
    return [NotificationResponse.model_validate(n) for n in items]


@router.post("/{notif_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notif_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await mark_read(db, notif_id, current_user.id)
    await db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await mark_all_read(db, current_user.id)
    await db.commit()


@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_notification(
    notif_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await delete_notification(db, notif_id, current_user.id)
    await db.commit()
