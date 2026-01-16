from rest_framework import viewsets, permissions, mixins
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer

class ChatPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'

class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Возвращаем чаты, где юзер либо владелец, либо вет
        return ChatRoom.objects.filter(
            Q(owner=user) | Q(vet=user)
        ).select_related('pet', 'vet', 'owner').order_by('-updated_at')

class ChatMessageViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ChatPagination

    def get_queryset(self):
        user = self.request.user
        # БЕРЕМ ID КОМНАТЫ ИЗ QUERY PARAMETERS (?room_id=1)
        room_id = self.request.query_params.get('room_id')

        if not room_id:
            # Если не передали ID комнаты, возвращаем пустоту (или можно кинуть ошибку)
            return ChatMessage.objects.none()

        # Проверяем доступ: юзер должен быть участником этой комнаты
        # Это также защищает от просмотра чужих переписок
        return ChatMessage.objects.filter(
            room_id=room_id, 
            room__in=ChatRoom.objects.filter(Q(owner=user) | Q(vet=user))
        ).order_by('-created_at') # Для пагинации свежие сверху