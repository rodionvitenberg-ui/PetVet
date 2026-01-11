# notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Импорты моделей
from pets.models import HealthEvent, PetAccess
from .models import Notification
from .serializers import NotificationSerializer

# === СИГНАЛ 1: БИЗНЕС-ЛОГИКА ===
@receiver(post_save, sender=HealthEvent)
def create_notification_on_event(sender, instance, created, **kwargs):
    if not created:
        return

    # 1. Определяем список получателей
    recipients = set()
    if instance.pet.owner:
        recipients.add(instance.pet.owner)
    
    active_accesses = PetAccess.objects.filter(pet=instance.pet, is_active=True)
    for access in active_accesses:
        recipients.add(access.user)
    
    # Исключаем автора события, чтобы не спамить ему самому
    if instance.created_by in recipients:
        recipients.remove(instance.created_by)

    if not recipients:
        return

    # 2. Готовим данные
    title_text = f"Новое событие: {instance.title}"
    
    # Определяем имя автора
    author_name = 'System'
    if instance.created_by:
        # Если есть профиль врача/пользователя, берем имя оттуда, иначе username
        author_name = getattr(instance.created_by, 'first_name', instance.created_by.username)

    message_text = f"{author_name} добавил запись «{instance.get_event_type_display()}» для питомца {instance.pet.name}."

    # --- ГЕНЕРАЦИЯ ССЫЛКИ ---
    # Ссылка ведет на страницу питомца и сразу открывает вкладку 'medical'
    target_link = f"/pets/{instance.pet.id}?tab=medical"

    notifications_to_create = []
    for user in recipients:
        notifications_to_create.append(Notification(
            recipient=user,
            category='medical',
            title=title_text,
            message=message_text,
            content_object=instance,
            # Сохраняем ссылку в metadata (предполагаем, что в модели Notification есть JSONField metadata)
            metadata={
                "link": target_link,
                "pet_id": instance.pet.id,
                "event_id": instance.id
            }
        ))
    
    # Сохраняем по одному, чтобы сработал сигнал отправки (Сигнал 2)
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