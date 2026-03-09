from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Optional
import enum

from sqlalchemy import (
    String, Boolean, DateTime, Date, Text, ForeignKey,
    Enum as SAEnum, func, JSON, Uuid
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class ActivityStatus(str, enum.Enum):
    open = "Open"
    in_progress = "In Progress"
    closed = "Closed"
    on_hold = "On-Hold"
    completed = "Completed"


class AuditAction(str, enum.Enum):
    create = "CREATE"
    update = "UPDATE"
    delete = "DELETE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False, default=UserRole.user)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    activities_assigned: Mapped[list["Activity"]] = relationship("Activity", foreign_keys="Activity.assigned_to_id", back_populates="assigned_to")
    activities_created: Mapped[list["Activity"]] = relationship("Activity", foreign_keys="Activity.created_by_id", back_populates="created_by")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="changed_by")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    action_item: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    product_domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    activity_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_closure_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    initial_target_closure_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_closure_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[ActivityStatus] = mapped_column(SAEnum(ActivityStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ActivityStatus.open)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigned_to: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to_id], back_populates="activities_assigned")
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id], back_populates="activities_created")
    target_date_history: Mapped[list["TargetDateHistory"]] = relationship("TargetDateHistory", back_populates="activity", order_by="TargetDateHistory.changed_at")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="task")
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    related_activity_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    related_activity: Mapped[Optional["Activity"]] = relationship("Activity", foreign_keys=[related_activity_id])


class TargetDateHistory(Base):
    __tablename__ = "target_date_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True)
    old_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    new_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    activity: Mapped["Activity"] = relationship("Activity", back_populates="target_date_history")
    changed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[changed_by_id])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    action: Mapped[AuditAction] = mapped_column(SAEnum(AuditAction, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Relationships
    changed_by: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
