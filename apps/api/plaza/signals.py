import logging
from django.contrib.auth.signals import user_logged_out
from django.db.models.signals import post_save
from django.dispatch import receiver
from accounts.models import Member
from config.errors import DomainError
from .presence import revoke_actor, revoke_session

logger = logging.getLogger(__name__)


@receiver(user_logged_out)
def logout_presence(sender, request, user, **kwargs):
    if user and request:
        try:
            revoke_session(user.pk, request.session.session_key)
        except DomainError:
            logger.warning("Plaza presence expiry will finish a disconnected logout.")


@receiver(post_save, sender=Member)
def unavailable_member(sender, instance, **kwargs):
    if instance.suspended or not instance.is_active:
        try:
            revoke_actor(instance.pk)
        except DomainError:
            logger.warning("Plaza unavailable-member projection will remove expired presence.")
