# notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# [FIX] Импортируем новую модель
from pets.models import PetEvent, PetAccess
from .models import Notification
from .serializers import NotificationSerializer

@receiver(post_save, sender=PetEvent) # [FIX] Слушаем PetEvent
def create_notification_on_event(sender, instance, created, **kwargs):
    if not created:
        return

    # 1. Логика получателей (та же самая, она правильная)
    recipients = set()
    if instance.pet.owner:
        recipients.add(instance.pet.owner)
    
    active_accesses = PetAccess.objects.filter(pet=instance.pet, is_active=True)
    for access in active_accesses:
        recipients.add(access.user)
    
    if instance.created_by in recipients:
        recipients.remove(instance.created_by)

    if not recipients:
        return

    # 2. [FIX] Маппинг категорий (EventType -> Notification)
    # category в EventType: medical, reproduction, show, care, other
    # category в Notification: medical, reproduction, show, care, system...
    # Они почти совпадают, можно использовать напрямую или через маппинг
    event_cat = instance.event_type.category
    notif_category = event_cat if event_cat in ['medical', 'reproduction', 'show', 'care'] else 'system'

    # 3. Готовим данные
    title_text = f"Новое событие: {instance.title}"
    author_name = instance.created_by.get_full_name() if instance.created_by else 'System'
    
    message_text = f"Добавлено событие «{instance.event_type.name}» для питомца {instance.pet.name}. Автор: {author_name}."

    notifications_to_create = []
    for user in recipients:
        notifications_to_create.append(Notification(
            recipient=user,
            category=notif_category, # Используем вычисленную категорию
            title=title_text,
            message=message_text,
            content_object=instance, # Generic Link на PetEvent
            metadata={
                "pet_id": instance.pet.id,
                "event_id": instance.id,
                "event_type": instance.event_type.slug
            }
        ))
    
    # Сохраняем по одному, чтобы сработал сигнал доставки (send_delivery_ws)
    for n in notifications_to_create:
        n.save()


# === СИГНАЛ 2: ЛОГИКА ДОСТАВКИ (WebSockets) ===
@receiver(post_save, sender=Notification)
def send_delivery_ws(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = get_channel_layer()
    group_name = f"user_{instance.recipient.id}"

    # Сериализация
    try:
        serializer = NotificationSerializer(instance)
        data_to_send = serializer.data
    except Exception:
        # Fallback, если сериализатор упал
        data_to_send = {
            "id": instance.id,
            "title": instance.title,
            "message": instance.message,
            "category": instance.category,
            "metadata": instance.metadata or {}
        }

    # --- ВАЖНЫЙ МОМЕНТ ДЛЯ ФРОНТЕНДА ---
    # Фронтенд ищет data.link.
    # Если ссылка лежит внутри metadata, вытащим её на верхний уровень для удобства
    if instance.metadata and 'link' in instance.metadata:
        data_to_send['link'] = instance.metadata['link']

    # Отправка
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "send_notification",
            "data": data_to_send
        }
    )