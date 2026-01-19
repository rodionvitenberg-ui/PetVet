from django.db.models.signals import post_save
from django.dispatch import receiver
from pets.models import PetEvent, PetAccess
from .models import Notification, NotificationSettings
from .services import send_notification_to_user

# === 1. АВТО-НАСТРОЙКИ ДЛЯ НОВЫХ ЮЗЕРОВ ===
@receiver(post_save, sender='users.User') 
def create_settings_for_new_user(sender, instance, created, **kwargs):
    if created:
        NotificationSettings.objects.create(user=instance)

# === 2. СОЗДАНИЕ УВЕДОМЛЕНИЯ ПРИ СОБЫТИИ ===
@receiver(post_save, sender=PetEvent)
def create_notification_on_event(sender, instance, created, **kwargs):
    if not created:
        return

    # Собираем получателей
    recipients = set()
    if instance.pet.owner:
        recipients.add(instance.pet.owner)
    
    for access in PetAccess.objects.filter(pet=instance.pet, is_active=True):
        recipients.add(access.user)
    
    # Не уведомляем автора о его же действии (опционально, сейчас закомментировано)
    # if instance.created_by in recipients:
    #     recipients.remove(instance.created_by)

    if not recipients:
        return

    # Маппинг категорий
    category_map = {
        'medical': 'medical',
        'reproduction': 'reproduction',
        'show': 'show',
        'care': 'care',
        'other': 'system'
    }
    event_cat = instance.event_type.category if instance.event_type else 'other'
    notif_cat = category_map.get(event_cat, 'system')

    # Создаем уведомления (bulk_create не используем, чтобы сработал сигнал ниже)
    for user in recipients:
        Notification.objects.create(
            recipient=user,
            category=notif_cat,
            title=f"Новое событие: {instance.title}",
            message=f"{instance.pet.name}: {instance.event_type.name if instance.event_type else 'Событие'}",
            content_object=instance,
            metadata={
                "pet_id": instance.pet.id,
                "event_id": instance.id,
                "link": f"/dashboard?pet={instance.pet.id}&event={instance.id}" 
            }
        )

# === 3. ОТПРАВКА (МАРШРУТИЗАЦИЯ) ===
@receiver(post_save, sender=Notification)
def send_delivery(sender, instance, created, **kwargs):
    """
    Как только уведомление сохранено в БД -> Отдаем Маршрутизатору.
    """
    if created:
        send_notification_to_user(instance)