from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для просмотра уведомлений.
    Создавать уведомления через API нельзя (только через сигналы системы).
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Возвращаем только уведомления текущего пользователя
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Возвращает количество непрочитанных уведомлений.
        GET /api/notifications/unread_count/
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Пометить уведомление как прочитанное.
        POST /api/notifications/{id}/mark_read/
        """
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save()
        return Response({'status': 'success'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Пометить ВСЕ как прочитанные.
        POST /api/notifications/mark_all_read/
        """
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'success'})