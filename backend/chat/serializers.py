from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatMessage
from pets.models import Pet

User = get_user_model()

class UserShortSerializer(serializers.ModelSerializer):
    """
    Минимальная информация о пользователе для чата.
    """
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'avatar']

    def get_avatar(self, obj):
        # Если у тебя аватар лежит в модели User:
        if hasattr(obj, 'avatar') and obj.avatar:
             return obj.avatar.url
        # Если аватар в профиле (распространенная практика), раскомментируй ниже:
        # if hasattr(obj, 'profile') and obj.profile.avatar:
        #     return obj.profile.avatar.url
        return None

class PetShortSerializer(serializers.ModelSerializer):
    """
    Минимальная информация о питомце для списка чатов.
    """
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = ['id', 'name', 'avatar']
    
    def get_avatar(self, obj):
        # Берем главную картинку или первую попавшуюся
        image = obj.images.filter(is_main=True).first() or obj.images.first()
        if image:
            return image.image.url
        return None

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'sender_avatar', 'text', 'attachment', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']

    def get_sender_avatar(self, obj):
        # Дублируем логику получения аватара
        if hasattr(obj.sender, 'avatar') and obj.sender.avatar:
             return obj.sender.avatar.url
        return None

class ChatRoomSerializer(serializers.ModelSerializer):
    vet = UserShortSerializer(read_only=True)
    owner = UserShortSerializer(read_only=True)
    pet = PetShortSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'pet', 'vet', 'owner', 'updated_at', 'is_active', 'last_message']

    def get_last_message(self, obj):
        # Получаем последнее сообщение для превью
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return ChatMessageSerializer(last_msg).data
        return None