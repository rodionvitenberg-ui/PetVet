from rest_framework import serializers
from .models import SystemPrompt, AIChatSession, AIChatMessage


class AIConsultRequestSerializer(serializers.Serializer):
    pet_id = serializers.IntegerField(required=True)
    query = serializers.CharField(required=True, allow_blank=False, max_length=2000)

    class Meta:
        fields = ['pet_id', 'query']


class AIConsultResponseSerializer(serializers.Serializer):
    urgency = serializers.ChoiceField(choices=['low', 'medium', 'high'])
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()

    class Meta:
        fields = ['urgency', 'title', 'content']


class SystemPromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemPrompt
        fields = ['id', 'name']
        read_only_fields = ['id', 'name']


class AIChatSessionCreateSerializer(serializers.Serializer):
    pet_id = serializers.IntegerField(required=True)
    query = serializers.CharField(required=True, allow_blank=False, max_length=2000)
    system_prompt_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        fields = ['pet_id', 'query', 'system_prompt_id']


class AIChatStreamRequestSerializer(serializers.Serializer):
    query = serializers.CharField(required=True, allow_blank=False, max_length=2000)

    class Meta:
        fields = ['query']


class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = ['id', 'session', 'role', 'content', 'created_at']
        read_only_fields = ['id', 'session', 'role', 'content', 'created_at']


class PetBasicForChatSerializer(serializers.Serializer):
    """Minimal pet info for session listing."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    categories = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    def get_categories(self, obj):
        return [
            {"id": c.id, "name": c.name}
            for c in obj.categories.all()
        ]

    def get_images(self, obj):
        return [
            {"id": img.id, "image": img.image.url if img.image else None}
            for img in obj.images.all()[:1]
        ]

    class Meta:
        fields = ['id', 'name', 'categories', 'images']


class AIChatSessionSerializer(serializers.ModelSerializer):
    pet = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    def get_pet(self, obj):
        return PetBasicForChatSerializer(obj.pet).data

    def get_last_message(self, obj):
        last_msg = obj.last_message
        if last_msg:
            return {
                "role": last_msg.role,
                "content_preview": last_msg.content[:100],
                "created_at": last_msg.created_at.isoformat(),
            }
        return None

    def get_messages_count(self, obj):
        return obj.messages.count()

    class Meta:
        model = AIChatSession
        fields = [
            'id', 'pet', 'title', 'system_prompt_id',
            'last_message', 'messages_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'pet', 'title', 'last_message',
            'messages_count', 'created_at', 'updated_at'
        ]