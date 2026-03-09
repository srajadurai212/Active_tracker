from app.db.models import Activity, User, UserRole


def can_edit_activity(activity: Activity, user: User) -> bool:
    """Admin can edit any activity. Regular user can only edit activities assigned to them."""
    if user.role == UserRole.admin:
        return True
    return activity.assigned_to_id == user.id


def can_delete_activity(user: User) -> bool:
    """Only admins can delete activities."""
    return user.role == UserRole.admin


def can_set_status_closed(user: User) -> bool:
    """Only admins can set activity status to Closed."""
    return user.role == UserRole.admin
