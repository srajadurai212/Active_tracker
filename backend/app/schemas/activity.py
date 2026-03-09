from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.db.models import ActivityStatus
from app.schemas.user import UserResponse


class ActivityCreate(BaseModel):
    client_name: str
    entry_date: date
    action_item: str
    assigned_to_id: Optional[uuid.UUID] = None
    product_domain: Optional[str] = None
    activity_type: Optional[str] = None
    target_closure_date: Optional[date] = None
    actual_closure_date: Optional[date] = None
    status: ActivityStatus = ActivityStatus.open
    remarks: Optional[str] = None


class ActivityUpdate(BaseModel):
    client_name: Optional[str] = None
    entry_date: Optional[date] = None
    action_item: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    product_domain: Optional[str] = None
    activity_type: Optional[str] = None
    target_closure_date: Optional[date] = None
    actual_closure_date: Optional[date] = None
    status: Optional[ActivityStatus] = None
    remarks: Optional[str] = None
    target_date_change_remarks: Optional[str] = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_name: str
    entry_date: date
    action_item: str
    assigned_to_id: Optional[uuid.UUID]
    assigned_to: Optional[UserResponse] = None
    product_domain: Optional[str]
    activity_type: Optional[str]
    target_closure_date: Optional[date]
    initial_target_closure_date: Optional[date] = None
    actual_closure_date: Optional[date]
    status: ActivityStatus
    remarks: Optional[str]
    created_by_id: Optional[uuid.UUID]
    created_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    page_size: int


class RejectRequest(BaseModel):
    reason: Optional[str] = None


class TargetDateHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_id: uuid.UUID
    old_date: Optional[date]
    new_date: Optional[date]
    remarks: Optional[str]
    changed_by: Optional[UserResponse] = None
    changed_at: datetime
