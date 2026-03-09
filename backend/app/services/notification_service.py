from __future__ import annotations
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import Notification, User, UserRole


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    description: str,
    notif_type: str = "task",
    related_activity_id: Optional[uuid.UUID] = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        description=description,
        type=notif_type,
        related_activity_id=related_activity_id,
    )
    db.add(notif)
    await db.flush()
    return notif


async def _get_admin_ids(db: AsyncSession) -> list[uuid.UUID]:
    result = await db.execute(
        select(User.id).where(User.role == UserRole.admin, User.is_active == True)
    )
    return list(result.scalars().all())


async def notify_activity_status_change(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    new_status: str,
    assigned_to_id: Optional[uuid.UUID],
    changed_by_id: uuid.UUID,
) -> None:
    title = f"Status changed: {client_name}"
    description = f"Activity status updated to '{new_status}'"

    recipient_ids: set[uuid.UUID] = set(await _get_admin_ids(db))
    if assigned_to_id:
        recipient_ids.add(assigned_to_id)
    # Don't notify the person who made the change
    recipient_ids.discard(changed_by_id)

    for uid in recipient_ids:
        await create_notification(db, uid, title, description, "task", activity_id)


async def notify_activity_date_change(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    changed_fields: list[str],
    assigned_to_id: Optional[uuid.UUID],
    changed_by_id: uuid.UUID,
) -> None:
    label = " and ".join(
        "Target Date" if f == "target_closure_date" else "Actual Closure Date"
        for f in changed_fields
    )
    title = f"Date updated: {client_name}"
    description = f"{label} was updated"

    recipient_ids: set[uuid.UUID] = set(await _get_admin_ids(db))
    if assigned_to_id:
        recipient_ids.add(assigned_to_id)
    recipient_ids.discard(changed_by_id)

    for uid in recipient_ids:
        await create_notification(db, uid, title, description, "log", activity_id)


async def notify_activity_assigned(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    assigned_to_id: uuid.UUID,
    changed_by_id: uuid.UUID,
) -> None:
    title = f"Activity assigned: {client_name}"
    description = "You have been assigned to this activity"

    recipient_ids: set[uuid.UUID] = set(await _get_admin_ids(db))
    recipient_ids.add(assigned_to_id)
    recipient_ids.discard(changed_by_id)

    for uid in recipient_ids:
        await create_notification(db, uid, title, description, "message", activity_id)


async def notify_completed_for_review(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    assigned_to_id: Optional[uuid.UUID],
    changed_by_id: uuid.UUID,
) -> None:
    title = f"Review needed: {client_name}"
    description = "Activity marked Completed — please review and close if appropriate."

    recipient_ids: set[uuid.UUID] = set(await _get_admin_ids(db))
    recipient_ids.discard(changed_by_id)

    for uid in recipient_ids:
        await create_notification(db, uid, title, description, "review", activity_id)


async def notify_activity_approved(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    assigned_to_id: Optional[uuid.UUID],
    approved_by_id: uuid.UUID,
) -> None:
    if not assigned_to_id or assigned_to_id == approved_by_id:
        return
    title = f"Activity approved: {client_name}"
    description = "Your activity has been reviewed and closed."
    await create_notification(db, assigned_to_id, title, description, "approved", activity_id)


async def notify_activity_rejected(
    db: AsyncSession,
    activity_id: uuid.UUID,
    client_name: str,
    assigned_to_id: Optional[uuid.UUID],
    rejected_by_id: uuid.UUID,
    reason: Optional[str] = None,
) -> None:
    if not assigned_to_id or assigned_to_id == rejected_by_id:
        return
    title = f"Activity rejected: {client_name}"
    description = reason or "Your activity was sent back for further work."
    await create_notification(db, assigned_to_id, title, description, "rejected", activity_id)


async def get_user_notifications(
    db: AsyncSession,
    user_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 50,
) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        q = q.where(Notification.is_read == False)
    q = q.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, notif_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        db.add(notif)
        await db.flush()


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
    )
    for notif in result.scalars().all():
        notif.is_read = True
        db.add(notif)
    await db.flush()


async def delete_notification(db: AsyncSession, notif_id: uuid.UUID, user_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        await db.delete(notif)
        await db.flush()
