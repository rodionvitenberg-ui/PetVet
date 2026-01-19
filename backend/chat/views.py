from rest_framework import viewsets, permissions, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.shortcuts import get_object_or_404

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
        
        # [FIX] Берем room_id либо из URL (nested), либо из query params (?room_id=)
        room_id = self.kwargs.get('room_id') or self.request.query_params.get('room_id')

        if not room_id:
            return ChatMessage.objects.none()

        # Проверка прав: видим сообщения только своих комнат
        return ChatMessage.objects.filter(
            room_id=room_id, 
            room__in=ChatRoom.objects.filter(Q(owner=user) | Q(vet=user))
        ).order_by('-created_at')
    
class ChatAttachmentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file_obj = request.data.get('file')
        # Фронт теперь отправляет room_id в FormData
        room_id = request.data.get('room_id') 

        if not file_obj:
            return Response({"error": "Файл не найден"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not room_id:
            return Response({"error": "Не указан ID комнаты"}, status=status.HTTP_400_BAD_REQUEST)

        # Проверяем доступ к комнате
        room = get_object_or_404(ChatRoom, id=room_id)
        if request.user != room.owner and request.user != room.vet:
            return Response({"error": "Нет доступа к этому чату"}, status=status.HTTP_403_FORBIDDEN)

        # Создаем сообщение (текст пустой, но файл есть)
        message = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            attachment=file_obj,
            text="" # Благодаря миграции это поле теперь optional
        )
        
        # Поднимаем чат вверх списка
        room.updated_at = message.created_at
        room.save()

        # Возвращаем данные для сокета
        return Response({
            "id": message.id,
            "attachment": message.attachment.url,
            "created_at": message.created_at
        }, status=status.HTTP_201_CREATED)