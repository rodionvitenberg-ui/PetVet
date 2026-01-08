from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Импорты моделей
from pets.models import HealthEvent, PetAccess
from .models import Notification
from .serializers import NotificationSerializer # Пригодится для отправки чистого JSON

@receiver(post_save, sender=HealthEvent)
def notify_event_update(sender, instance, created, **kwargs):
    """
    Единый обработчик событий:
    1. Определяет получателей (Владелец + Врачи с доступом).
    2. Создает запись Notification в БД.
    3. Отправляет мгновенное сообщение через WebSockets.
    """
    
    # 1. Определяем список получателей
    recipients = set()
    
    # Всегда добавляем владельца
    if instance.pet.owner:
        recipients.add(instance.pet.owner)
    
    # Добавляем врачей, у которых есть АКТИВНЫЙ доступ к этому питомцу
    active_accesses = PetAccess.objects.filter(pet=instance.pet, is_active=True)
    for access in active_accesses:
        recipients.add(access.user)
    
    # ИСКЛЮЧАЕМ того, кто создал событие (чтобы не получать уведомление о своем же действии)
    # Например, если врач создал запись, уведомлять его не надо.
    if instance.created_by in recipients:
        recipients.remove(instance.created_by)

    # Если некому отправлять - выходим
    if not recipients:
        return

    # 2. Формируем данные уведомления
    # Логика текста (можно расширить для updates)
    if created:
        cat = 'medical'
        title_text = f"Новое событие: {instance.title}"
        message_text = f"Пользователь {instance.created_by.username if instance.created_by else 'System'} добавил запись для питомца {instance.pet.name}."
    else:
        # Если нужно уведомлять об изменениях, раскомментируй логику ниже
        # Пока пропускаем обновления, чтобы не спамить
        return 

    # Получаем слой каналов для WebSockets
    channel_layer = get_channel_layer()

    # 3. Рассылка
    for user in recipients:
        # А) Сохраняем в БД (чтобы сохранилось в истории)
        notification = Notification.objects.create(
            recipient=user,
            category=cat,
            title=title_text,
            message=message_text,
            content_object=instance
        )

        # Б) Отправляем в WebSocket (Мгновенно)
        # Группа пользователя формируется как "user_{id}"
        group_name = f"user_{user.id}"

        # Сериализуем уведомление, чтобы фронт получил красивый JSON
        # Можно передать notification_data вручную, но через сериализатор надежнее
        try:
            serializer = NotificationSerializer(notification)
            data_to_send = serializer.data
        except Exception:
            # Фолбэк, если сериализатор не сработал (например, circular imports)
            data_to_send = {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "category": notification.category,
                "created_at_formatted": notification.created_at.strftime("%d.%m.%Y %H:%M")
            }

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "send_notification",  # Это имя метода в consumers.py
                "data": data_to_send
            }
        )