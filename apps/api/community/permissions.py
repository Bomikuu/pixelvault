from config.errors import DomainError
from django.contrib.auth import get_user_model


def member_for(actor_id):
    try:
        return get_user_model().objects.get(pk=actor_id, is_active=True)
    except (get_user_model().DoesNotExist, ValueError):
        raise DomainError("not_found", "Record not found.", 404)


def staff_for(actor_id, roles):
    member = member_for(actor_id)
    if not member.is_staff or member.suspended or member.staff_role not in (*roles, "admin"):
        raise DomainError("forbidden", "This staff action is not permitted.", 403)
    return member
