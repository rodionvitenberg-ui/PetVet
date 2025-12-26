# notifications/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from pets.models import HealthEvent, PetAccess
from .models import Notification

@shared_task
def send_scheduled_reminders():
    now = timezone.now()
    # Интервал напоминания: например, события, которые случатся в ближайшие 24 часа
    time_threshold = now + timedelta(days=1)
    
    # 1. Ищем события, которые наступят СКОРО (по полю date)
    # Исключаем те, статус которых уже 'completed' или 'cancelled'
    upcoming_events = HealthEvent.objects.filter(
        date__lte=time_threshold,
        date__gt=now,
        status__in=['planned', 'confirmed']
    )

    for event in upcoming_events:
        # Важно: Не отправить уведомление дважды.
        # Проверяем, создавали ли мы уже уведомление типа 'reminder' для этого события
        already_notified = Notification.objects.filter(
            category='reminder',
            content_type__model='healthevent',
            object_id=event.id
        ).exists()
        
        if already_notified:
            continue

        # --- КОГО УВЕДОМЛЯТЬ? ---
        recipients = set()
        
        # 1. Владелец
        recipients.add(event.pet.owner)
        
        # 2. Ветеринары с доступом (PetAccess)
        # Получаем всех юзеров, у которых есть грант доступа к этому питомцу
        access_grants = PetAccess.objects.filter(pet=event.pet, is_active=True)
        for grant in access_grants:
            recipients.add(grant.user)

        # Рассылаем
        for user in recipients:
            Notification.objects.create(
                recipient=user,
                category='reminder',
                title=f"Напоминание: {event.title}",
                message=f"Напоминаем, что {event.date.strftime('%d.%m в %H:%M')} запланировано событие для {event.pet.name}.",
                content_object=event
            )