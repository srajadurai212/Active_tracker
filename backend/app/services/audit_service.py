import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog, AuditAction


def _serialize_value(v: Any) -> Any:
    if isinstance(v, uuid.UUID):
        return str(v)
    if hasattr(v, "value"):  # enum
        return v.value
    if hasattr(v, "isoformat"):  # date/datetime
        return v.isoformat()
    return v


def _serialize_dict(d: dict) -> dict:
    return {k: _serialize_value(v) for k, v in d.items() if v is not None or True}


def diff_dicts(old: dict, new: dict) -> tuple[dict, dict]:
    """Return only the changed keys in old and new."""
    changed_keys = {k for k in new if new.get(k) != old.get(k)}
    return (
        {k: old.get(k) for k in changed_keys},
        {k: new.get(k) for k in changed_keys},
    )


async def log_action(
    db: AsyncSession,
    table_name: str,
    record_id: uuid.UUID,
    action: AuditAction,
    changed_by_id: Optional[uuid.UUID],
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    if old_values and new_values and action == AuditAction.update:
        old_values, new_values = diff_dicts(
            _serialize_dict(old_values),
            _serialize_dict(new_values),
        )
    else:
        old_values = _serialize_dict(old_values) if old_values else None
        new_values = _serialize_dict(new_values) if new_values else None

    log = AuditLog(
        table_name=table_name,
        record_id=record_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        changed_by_id=changed_by_id,
        ip_address=ip_address,
    )
    db.add(log)
    return log
