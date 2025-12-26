# config/asgi.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
# AuthMiddlewareStack работает для браузеров (Cookie). 
# Для JWT в мобайле нужно будет написать свой Middleware или использовать библиотеку 'channels-jwt-auth-middleware'
from channels.auth import AuthMiddlewareStack 
import notifications.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            notifications.routing.websocket_urlpatterns
        )
    ),
})