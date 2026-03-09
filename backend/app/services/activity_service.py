from __future__ import annotations
import uuid
from datetime import datetime, timezone, date
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.db.models import Activity, ActivityStatus, User, UserRole, AuditAction, TargetDateHistory
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.services.audit_service import log_action
from app.services.notification_service import (
    notify_activity_status_change,
    notify_activity_date_change,
    notify_activity_assigned,
    notify_completed_for_review,
)
from app.core.permissions import can_edit_activity, can_delete_activity, can_set_status_closed


def _activity_to_dict(activity: Activity) -> dict:
    return {
        "client_name": activity.client_name,
        "entry_date": activity.entry_date,
        "action_item": activity.action_item,
        "assigned_to_id": activity.assigned_to_id,
        "product_domain": activity.product_domain,
        "activity_type": activity.activity_type,
        "target_closure_date": activity.target_closure_date,
        "actual_closure_date": activity.actual_closure_date,
        "status": activity.status,
        "remarks": activity.remarks,
    }


async def get_activities(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status: Optional[List[ActivityStatus]] = None,
    assigned_to_id: Optional[List[uuid.UUID]] = None,
    client_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    overdue_only: bool = False,
) -> tuple[list[Activity], int]:
    filters = [Activity.deleted_at == None]

    if status:
        filters.append(Activity.status.in_(status))
    if assigned_to_id:
        filters.append(Activity.assigned_to_id.in_(assigned_to_id))
    if client_name:
        filters.append(Activity.client_name.ilike(f"%{client_name}%"))
    if date_from:
        filters.append(Activity.entry_date >= date_from)
    if date_to:
        filters.append(Activity.entry_date <= date_to)
    if search:
        filters.append(
            or_(
                Activity.client_name.ilike(f"%{search}%"),
                Activity.action_item.ilike(f"%{search}%"),
                Activity.remarks.ilike(f"%{search}%"),
            )
        )
    if overdue_only:
        filters.append(Activity.target_closure_date < date.today())
        filters.append(Activity.status != ActivityStatus.closed)

    where_clause = and_(*filters)

    count_result = await db.execute(
        select(func.count()).select_from(Activity).where(where_clause)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.assigned_to), selectinload(Activity.created_by))
        .where(where_clause)
        .order_by(Activity.entry_date.desc(), Activity.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all(), total


async def get_activity_by_id(db: AsyncSession, activity_id: uuid.UUID) -> Optional[Activity]:
    result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.assigned_to), selectinload(Activity.created_by))
        .where(Activity.id == activity_id, Activity.deleted_at == None)
    )
    return result.scalar_one_or_none()


async def create_activity(
    db: AsyncSession,
    data: ActivityCreate,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Activity:
    activity = Activity(
        client_name=data.client_name,
        entry_date=data.entry_date,
        action_item=data.action_item,
        assigned_to_id=data.assigned_to_id if data.assigned_to_id else current_user.id,
        product_domain=data.product_domain,
        activity_type=data.activity_type,
        target_closure_date=data.target_closure_date,
        initial_target_closure_date=data.target_closure_date,
        actual_closure_date=data.actual_closure_date,
        status=data.status,
        remarks=data.remarks,
        created_by_id=current_user.id,
    )
    db.add(activity)
    await db.flush()

    # Record initial target date history entry if a date was set
    if data.target_closure_date:
        tdh = TargetDateHistory(
            activity_id=activity.id,
            old_date=None,
            new_date=data.target_closure_date,
            remarks="Initial target date",
            changed_by_id=current_user.id,
        )
        db.add(tdh)
        await db.flush()

    await log_action(
        db=db,
        table_name="activities",
        record_id=activity.id,
        action=AuditAction.create,
        changed_by_id=current_user.id,
        new_values=_activity_to_dict(activity),
        ip_address=ip_address,
    )

    # Notify assigned user + admins about new assignment
    if activity.assigned_to_id:
        await notify_activity_assigned(
            db=db,
            activity_id=activity.id,
            client_name=activity.client_name,
            assigned_to_id=activity.assigned_to_id,
            changed_by_id=current_user.id,
        )

    return activity


async def update_activity(
    db: AsyncSession,
    activity: Activity,
    data: ActivityUpdate,
    current_user: User,
    ip_address: Optional[str] = None,
) -> Activity:
    from fastapi import HTTPException, status as http_status
    if not can_edit_activity(activity, current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not allowed to edit this activity")

    old_values = _activity_to_dict(activity)
    old_status = activity.status
    old_target_date = activity.target_closure_date

    update_data = data.model_dump(exclude_unset=True)

    # Check "Closed" status permission before applying any changes
    new_status = update_data.get("status")
    if new_status == ActivityStatus.closed and not can_set_status_closed(current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only admins can set status to Closed")

    # Check if target date is being changed — require remarks from non-admins
    new_target_date = update_data.get("target_closure_date")
    target_date_changing = "target_closure_date" in update_data and new_target_date != old_target_date
    if target_date_changing and current_user.role != UserRole.admin:
        remarks_val = (data.target_date_change_remarks or "").strip()
        if not remarks_val:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Reason for date change is required when modifying the target closure date",
            )

    # Apply field updates (exclude non-model field target_date_change_remarks)
    for field, value in update_data.items():
        if field == "target_date_change_remarks":
            continue
        setattr(activity, field, value)

    await db.flush()

    # Insert target date history record if date changed
    if target_date_changing:
        remarks_val = (data.target_date_change_remarks or "").strip() or None
        tdh = TargetDateHistory(
            activity_id=activity.id,
            old_date=old_target_date,
            new_date=new_target_date,
            remarks=remarks_val,
            changed_by_id=current_user.id,
        )
        db.add(tdh)
        # Set initial_target_closure_date if it was never set
        if activity.initial_target_closure_date is None and new_target_date:
            activity.initial_target_closure_date = new_target_date
        await db.flush()

    new_values = _activity_to_dict(activity)
    await log_action(
        db=db,
        table_name="activities",
        record_id=activity.id,
        action=AuditAction.update,
        changed_by_id=current_user.id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )

    # Trigger notifications based on what changed
    if "status" in update_data and activity.status != old_status:
        await notify_activity_status_change(
            db=db,
            activity_id=activity.id,
            client_name=activity.client_name,
            new_status=activity.status.value,
            assigned_to_id=activity.assigned_to_id,
            changed_by_id=current_user.id,
        )
        # Notify admins to review when marked Completed
        if activity.status == ActivityStatus.completed:
            await notify_completed_for_review(
                db=db,
                activity_id=activity.id,
                client_name=activity.client_name,
                assigned_to_id=activity.assigned_to_id,
                changed_by_id=current_user.id,
            )

    date_fields_changed = [
        f for f in ("target_closure_date", "actual_closure_date")
        if f in update_data and update_data[f] != old_values.get(f)
    ]
    if date_fields_changed:
        await notify_activity_date_change(
            db=db,
            activity_id=activity.id,
            client_name=activity.client_name,
            changed_fields=date_fields_changed,
            assigned_to_id=activity.assigned_to_id,
            changed_by_id=current_user.id,
        )

    if "assigned_to_id" in update_data and activity.assigned_to_id and activity.assigned_to_id != old_values.get("assigned_to_id"):
        await notify_activity_assigned(
            db=db,
            activity_id=activity.id,
            client_name=activity.client_name,
            assigned_to_id=activity.assigned_to_id,
            changed_by_id=current_user.id,
        )

    return activity


async def delete_activity(
    db: AsyncSession,
    activity: Activity,
    current_user: User,
    ip_address: Optional[str] = None,
) -> None:
    from fastapi import HTTPException, status as http_status
    if not can_delete_activity(current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only admins can delete activities")

    old_values = _activity_to_dict(activity)
    activity.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    await log_action(
        db=db,
        table_name="activities",
        record_id=activity.id,
        action=AuditAction.delete,
        changed_by_id=current_user.id,
        old_values=old_values,
        ip_address=ip_address,
    )
