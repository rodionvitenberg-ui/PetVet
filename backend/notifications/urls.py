from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()

# URL: /api/notifications/
# URL: /api/notifications/unread_count/
# URL: /api/notifications/{id}/mark_read/
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]