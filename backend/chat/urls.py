from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatRoomViewSet, ChatMessageViewSet

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chat-rooms')
# Для сообщений используем nested структуру или фильтры, но пока так:
router.register(r'messages', ChatMessageViewSet, basename='chat-messages')

urlpatterns = [
    path('', include(router.urls)),
]