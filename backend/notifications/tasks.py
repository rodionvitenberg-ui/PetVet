# notifications/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from pets.models import PetEvent, PetAccess
from .models import Notification

@shared_task
def send_scheduled_reminders():
    now = timezone.now().date() # Важно работать с датами, PetEvent.date - это DateField
    # Напоминаем за 1 день ДО события
    reminder_date = now + timedelta(days=1)
    
    # 1. Ищем события на ЗАВТРА, статус = planned
    upcoming_events = PetEvent.objects.filter(
        date=reminder_date,
        status='planned' # [FIX] У PetEvent статус 'planned', а не 'confirmed'
    ).select_related('pet__owner', 'event_type')

    for event in upcoming_events:
        # Проверка на дубликаты (через content_type)
        already_notified = Notification.objects.filter(
            category='reminder',
            object_id=event.id,
            content_type__model='petevent' # Важно: имя модели в нижнем регистре
        ).exists()
        
        if already_notified:
            continue

        # Собираем получателей
        recipients = set()
        if event.pet.owner:
            recipients.add(event.pet.owner)
        
        for grant in PetAccess.objects.filter(pet=event.pet, is_active=True):
            recipients.add(grant.user)

        # Рассылаем
        for user in recipients:
            Notification.objects.create(
                recipient=user,
                category='reminder',
                title=f"Напоминание: {event.title}",
                message=f"Завтра ({event.date}) запланировано событие: {event.event_type.name} для {event.pet.name}.",
                content_object=event, # Связь с событием
                metadata={
                    "event_date": str(event.date),
                    "pet_id": event.pet.id
                }
            )