from rest_framework.throttling import BaseThrottle
from django.utils import timezone
from .models import AIChatMessage


class AILimitThrottle(BaseThrottle):
    """
    Дневной лимит ответов ИИ:
    - обычный пользователь: 4 ответа в сутки;
    - ветеринар (подписчик): 12 ответов в сутки.

    Считаем ассистентские сообщения (role=ASSISTANT) за текущий день.
    """
    FREE_DAILY_LIMIT = 4
    VET_DAILY_LIMIT = 12

    def get_limit(self, user):
        if user and getattr(user, 'is_veterinarian', False):
            return self.VET_DAILY_LIMIT
        return self.FREE_DAILY_LIMIT

    def get_used_today(self, user):
        today = timezone.localdate()
        return AIChatMessage.objects.filter(
            role=AIChatMessage.Role.ASSISTANT,
            session__user=user,
            created_at__date=today,
        ).count()

    def allow_request(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        used = self.get_used_today(user)
        limit = self.get_limit(user)

        if used >= limit:
            self.wait = 0
            return False

        return True