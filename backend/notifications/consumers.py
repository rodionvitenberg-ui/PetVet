import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Получаем пользователя из scope (об этом ниже, в Middleware)
        self.user = self.scope.get("user")

        if not self.user or self.user.is_anonymous:
            # Если не авторизован — разрываем соединение
            await self.close()
        else:
            # 2. Создаем уникальную "комнату" для пользователя: user_1, user_2...
            self.group_name = f"user_{self.user.id}"

            # Подписываем текущее соединение на эту группу
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Метод, который будет вызываться, когда мы шлем сообщение из кода (сигнала)
    async def send_notification(self, event):
        # Отправляем JSON клиенту (в мобилку или браузер)
        await self.send(text_data=json.dumps(event["data"]))