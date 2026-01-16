import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, ChatMessage
from pets.models import PetAccess

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope.get("user")

        # --- ОТЛАДКА ---
        print(f"DEBUG: Connect attempt to Room {self.room_id}")
        print(f"DEBUG: User found: {self.user} (Is Auth: {self.user.is_authenticated})")
        # ----------------

        # 1. Проверка прав доступа
        if not await self.can_access_room(self.user, self.room_id):
            print(f"DEBUG: Access DENIED for {self.user} to room {self.room_id}") # <--- Ловим отказ
            await self.close()
            return

        print("DEBUG: Access GRANTED") # <--- Ловим успех

        # 2. Подключение к группе
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    # Получение сообщения от WebSocket (клиента)
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_text = text_data_json['message']

        # 3. Сохранение в БД
        new_msg = await self.save_message(self.user, self.room_id, message_text)

        # 4. Отправка сообщения всей группе (включая отправителя)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_text,
                'sender_id': self.user.id,
                'sender_name': self.user.username, # Или .first_name
                'created_at': new_msg.created_at.isoformat(),
            }
        )

    # Обработка события chat_message
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'created_at': event['created_at'],
        }))

    # --- Вспомогательные методы (обращение к БД) ---
    @database_sync_to_async
    def can_access_room(self, user, room_id):
        if not user.is_authenticated:
            return False
        try:
            room = ChatRoom.objects.get(id=room_id)
            # Доступ имеют: Владелец комнаты, Вет комнаты
            if user == room.owner or user == room.vet:
                # *Важно*: Тут можно добавить доп. проверку актуальности PetAccess, 
                # если мы хотим блокировать чат при отзыве прав.
                return True
            return False
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, user, room_id, text):
        room = ChatRoom.objects.get(id=room_id)
        msg = ChatMessage.objects.create(room=room, sender=user, text=text)
        room.updated_at = msg.created_at # Обновляем время комнаты (чтобы поднять вверх в списке)
        room.save()
        return msg