import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import notifications.routing
import chat.routing  # Импортируем роутинг чата
from chat.middleware import JwtAuthMiddleware # <--- Импортируем наш Middleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JwtAuthMiddleware(  # <--- Оборачиваем роутеры в наш Middleware
            URLRouter(
                # Объединяем маршруты уведомлений и чата
                notifications.routing.websocket_urlpatterns +
                chat.routing.websocket_urlpatterns
            )
        )
    ),
})