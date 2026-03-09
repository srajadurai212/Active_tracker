from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict

from app.db.models import AuditAction
from app.schemas.user import UserResponse


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    table_name: str
    record_id: uuid.UUID
    action: AuditAction
    old_values: Optional[dict[str, Any]]
    new_values: Optional[dict[str, Any]]
    changed_by_id: Optional[uuid.UUID]
    changed_by: Optional[UserResponse] = None
    changed_at: datetime
    ip_address: Optional[str]


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
