from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.db import close_old_connections
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user(token_key):
    try:
        # Используем валидатор SimpleJWT, он сам проверит подпись и срок действия
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, InvalidToken, User.DoesNotExist):
        return AnonymousUser()

class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Закрываем старые соединения БД перед асинхронным вызовом
        close_old_connections()

        # Получаем строку запроса (все, что после ?)
        query_string = scope.get("query_string", b"").decode("utf-8")
        
        # Парсим параметры
        query_params = parse_qs(query_string)
        
        # Берем токен из параметра 'token' (если есть)
        token = query_params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user(token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)