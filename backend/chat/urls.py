from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, ChatMessageViewSet, ChatAttachmentUploadView

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chat-rooms')
router.register(r'messages', ChatMessageViewSet, basename='chat-messages')

urlpatterns = [
    # Подключаем роутер (генерирует /rooms/ и /messages/)
    path('', include(router.urls)),

    # [NEW] Эндпоинт для загрузки файлов (POST)
    path('attachments/upload/', ChatAttachmentUploadView.as_view(), name='chat-upload'),

    # [FIX] Поддержка пути, который использует фронтенд: /api/chat/rooms/{id}/messages/
    # Мы направляем этот URL прямо в метод list нашего ChatMessageViewSet
    path('rooms/<int:room_id>/messages/', ChatMessageViewSet.as_view({'get': 'list'}), name='chat-room-messages'),
]