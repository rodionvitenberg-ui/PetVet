import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, ChatMessage

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope.get("user")

        # Проверка прав (как и раньше)
        if not await self.can_access_room(self.user, self.room_id):
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Получение сообщения от клиента
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_text = text_data_json.get('message', '')
        # attachment_id здесь - это ID сообщения, которое уже создано через REST API
        attachment_id = text_data_json.get('attachment_id', None)

        # [FIX] Сохраняем или обновляем сообщение
        msg = await self.save_message(self.user, self.room_id, message_text, attachment_id)

        # Отправка обновления всем (включая отправителя)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': msg.id,
                'message': msg.text,          # Используем актуальный текст из объекта
                'sender_id': self.user.id,
                'sender_name': self.user.username,
                # Если у сообщения есть файл, отправляем его URL
                'attachment': msg.attachment.url if msg.attachment else None,
                'created_at': msg.created_at.isoformat(),
            }
        )

    # Отправка данных в WebSocket
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'attachment': event.get('attachment'),
            'created_at': event['created_at'],
        }))

    @database_sync_to_async
    def can_access_room(self, user, room_id):
        if not user.is_authenticated: return False
        try:
            room = ChatRoom.objects.get(id=room_id)
            return user == room.owner or user == room.vet
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, user, room_id, text, attachment_id=None):
        room = ChatRoom.objects.get(id=room_id)
        
        # [FIX] ЛОГИКА ОБНОВЛЕНИЯ ВМЕСТО СОЗДАНИЯ
        if attachment_id:
            try:
                # Пытаемся найти сообщение, созданное загрузчиком файла
                # Важно проверить sender=user, чтобы нельзя было чужое сообщение перезаписать
                msg = ChatMessage.objects.get(id=attachment_id, room=room, sender=user)
                msg.text = text # Дописываем текст к картинке
                msg.save()
            except ChatMessage.DoesNotExist:
                # Если вдруг ID левый — создаем новое сообщение как фоллбек
                msg = ChatMessage.objects.create(room=room, sender=user, text=text)
        else:
            # Обычное текстовое сообщение
            msg = ChatMessage.objects.create(room=room, sender=user, text=text)
        
        # Обновляем "время последнего сообщения" в комнате
        room.updated_at = msg.created_at
        room.save()
        
        return msg