from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    # Форматируем дату красиво
    created_at_formatted = serializers.DateTimeField(source='created_at', format="%d.%m.%Y %H:%M", read_only=True)
    
    # Магия GenericForeignKey: отдаем фронту инфу, куда кликать
    linked_object = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 
            'category', 
            'title', 
            'message', 
            'is_read', 
            'created_at', 
            'created_at_formatted',
            'linked_object',
            'metadata',
        ]

    def get_linked_object(self, obj):
        """
        Возвращает тип и ID связанного объекта.
        Например: {'type': 'healthevent', 'id': 123}
        """
        if obj.content_object:
            return {
                # model_name будет 'healthevent', 'pet' и т.д.
                'type': obj.content_type.model, 
                'id': obj.object_id
            }
        return None