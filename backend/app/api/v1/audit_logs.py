from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_admin_user
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse
from app.db.models import AuditLog, AuditAction, User

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[AuditAction] = None,
    table_name: Optional[str] = None,
    changed_by_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if table_name:
        filters.append(AuditLog.table_name == table_name)
    if changed_by_id:
        filters.append(AuditLog.changed_by_id == changed_by_id)
    if date_from:
        filters.append(AuditLog.changed_at >= date_from)
    if date_to:
        filters.append(AuditLog.changed_at <= date_to)

    where_clause = and_(*filters) if filters else True

    count_result = await db.execute(
        select(func.count()).select_from(AuditLog).where(where_clause)
    )
    total = count_result.scalar_one()

    skip = (page - 1) * page_size
    result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.changed_by))
        .where(where_clause)
        .order_by(AuditLog.changed_at.desc())
        .offset(skip)
        .limit(page_size)
    )
    logs = result.scalars().all()

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
