from __future__ import annotations
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_user, get_admin_user
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse, ActivityListResponse, TargetDateHistoryResponse, RejectRequest
from app.schemas.audit_log import AuditLogResponse
from app.services.activity_service import (
    get_activities, get_activity_by_id, create_activity, update_activity, delete_activity
)
from app.services.notification_service import notify_activity_approved, notify_activity_rejected
from app.services.audit_service import log_action
from app.db.models import Activity, ActivityStatus, AuditAction, AuditLog, User, TargetDateHistory

router = APIRouter(prefix="/activities", tags=["activities"])


def _get_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=2000),
    status: Optional[List[ActivityStatus]] = Query(default=None),
    assigned_to_id: Optional[List[uuid.UUID]] = Query(default=None),
    client_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    overdue_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skip = (page - 1) * page_size
    items, total = await get_activities(
        db,
        skip=skip,
        limit=page_size,
        status=status or None,
        assigned_to_id=assigned_to_id or None,
        client_name=client_name,
        date_from=date_from,
        date_to=date_to,
        search=search,
        overdue_only=overdue_only,
    )
    return ActivityListResponse(
        items=[ActivityResponse.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/counts", response_model=dict)
async def get_activity_status_counts(
    assigned_to_id: Optional[List[uuid.UUID]] = Query(default=None),
    overdue_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _current: User = Depends(get_current_user),
):
    """Return per-status counts for the status tabs. Must be before /{activity_id}."""
    from datetime import date as date_type
    from sqlalchemy import and_

    filters = [Activity.deleted_at == None]
    if assigned_to_id:
        filters.append(Activity.assigned_to_id.in_(assigned_to_id))
    if overdue_only:
        filters.append(Activity.target_closure_date < date_type.today())
        filters.append(Activity.status != ActivityStatus.closed)

    rows = (
        await db.execute(
            select(Activity.status, func.count().label("cnt"))
            .where(and_(*filters))
            .group_by(Activity.status)
        )
    ).all()

    counts = {r.status.value: r.cnt for r in rows}
    total = sum(counts.values())
    counts["All"] = total
    return counts


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_new_activity(
    data: ActivityCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await create_activity(db, data, current_user, ip_address=_get_ip(request))
    await db.commit()
    # Reload with relationships
    activity = await get_activity_by_id(db, activity.id)
    return ActivityResponse.model_validate(activity)


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current: User = Depends(get_current_user),
):
    activity = await get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return ActivityResponse.model_validate(activity)


@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_existing_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    activity = await update_activity(db, activity, data, current_user, ip_address=_get_ip(request))
    await db.commit()
    activity = await get_activity_by_id(db, activity_id)
    return ActivityResponse.model_validate(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_activity(
    activity_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    await delete_activity(db, activity, current_user, ip_address=_get_ip(request))
    await db.commit()


@router.get("/{activity_id}/history", response_model=list[AuditLogResponse])
async def get_activity_history(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.changed_by))
        .where(AuditLog.table_name == "activities", AuditLog.record_id == activity_id)
        .order_by(AuditLog.changed_at.desc())
    )
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]


@router.post("/{activity_id}/approve", response_model=ActivityResponse)
async def approve_activity(
    activity_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    activity = await get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    if activity.status != ActivityStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Completed activities can be approved")

    old_status = activity.status.value
    activity.status = ActivityStatus.closed
    await db.flush()

    await log_action(
        db=db, table_name="activities", record_id=activity.id,
        action=AuditAction.update, changed_by_id=current_user.id,
        old_values={"status": old_status}, new_values={"status": "Closed"},
        ip_address=_get_ip(request),
    )
    await notify_activity_approved(db, activity.id, activity.client_name, activity.assigned_to_id, current_user.id)
    await db.commit()
    activity = await get_activity_by_id(db, activity_id)
    return ActivityResponse.model_validate(activity)


@router.post("/{activity_id}/reject", response_model=ActivityResponse)
async def reject_activity(
    activity_id: uuid.UUID,
    body: RejectRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    activity = await get_activity_by_id(db, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    if activity.status != ActivityStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Completed activities can be rejected")

    old_status = activity.status.value
    activity.status = ActivityStatus.in_progress
    await db.flush()

    await log_action(
        db=db, table_name="activities", record_id=activity.id,
        action=AuditAction.update, changed_by_id=current_user.id,
        old_values={"status": old_status}, new_values={"status": "In Progress"},
        ip_address=_get_ip(request),
    )
    await notify_activity_rejected(db, activity.id, activity.client_name, activity.assigned_to_id, current_user.id, body.reason)
    await db.commit()
    activity = await get_activity_by_id(db, activity_id)
    return ActivityResponse.model_validate(activity)


@router.get("/{activity_id}/target-date-history", response_model=list[TargetDateHistoryResponse])
async def get_activity_target_date_history(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TargetDateHistory)
        .options(selectinload(TargetDateHistory.changed_by))
        .where(TargetDateHistory.activity_id == activity_id)
        .order_by(TargetDateHistory.changed_at.desc())
    )
    rows = result.scalars().all()
    return [TargetDateHistoryResponse.model_validate(r) for r in rows]
