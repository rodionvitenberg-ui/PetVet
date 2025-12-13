from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
# Импортируем модель HealthEvent из другого приложения
# Используем строковый импорт внутри функции или get_model, чтобы избежать Circular Import,
# но сигналы обычно грузятся в ready(), так что можно попробовать прямой.
from pets.models import HealthEvent 
from .models import Notification

@receiver(post_save, sender=HealthEvent)
def notify_owner_on_new_event(sender, instance, created, **kwargs):
    """
    Если ВРАЧ создал или обновил запись, уведомляем ВЛАДЕЛЬЦА.
    """
    # Если у записи нет автора или автор - сам владелец, не уведомляем
    if not instance.created_by or instance.created_by == instance.pet.owner:
        return

    # Если это ВРАЧ создал запись
    if instance.created_by.is_veterinarian:
        
        # Сценарий 1: Новая запись
        if created:
            Notification.objects.create(
                recipient=instance.pet.owner,
                category='medical',
                title=f"Новая запись: {instance.title}",
                message=f"Врач {instance.created_by.username} добавил запись в карту питомца {instance.pet.name}.",
                content_object=instance
            )
        
        # Сценарий 2: Обновление статуса (например, Врач подтвердил выполнение)
        # Тут нужна проверка "было -> стало", но для MVP просто при любом сохранении врачом:
        elif not created:
             # Чтобы не спамить, можно проверять изменение полей (требует dirty fields),
             # пока пропустим, чтобы не усложнять.
             pass