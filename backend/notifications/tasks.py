from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from pets.models import PetEvent, PetAccess
from .models import Notification, NotificationSettings

@shared_task
def send_flexible_reminders():
    """
    Умная рассылка напоминаний.
    Запускается каждую минуту. 
    Проверяет настройки пользователей и шлет уведомления в нужное время.
    """
    now = timezone.now()
    
    # 1. Получаем уникальные настройки времени (например: 15, 60, 1440 минут), 
    # которые реально используют активные пользователи.
    active_times = NotificationSettings.objects.values_list('reminder_time_minutes', flat=True).distinct()

    for minutes in active_times:
        # Определяем "окно" времени события
        # Ищем события, которые начнутся через `minutes` (с погрешностью 1 минута, т.к. таск ежеминутный)
        target_time_start = now + timedelta(minutes=minutes)
        target_time_end = target_time_start + timedelta(minutes=1)

        # 2. Ищем запланированные события в этом окне
        events = PetEvent.objects.filter(
            date__range=(target_time_start, target_time_end),
            status='planned'
        ).select_related('pet__owner', 'event_type')

        for event in events:
            # 3. Собираем потенциальных получателей для этого события
            candidates = set()
            if event.pet.owner:
                candidates.add(event.pet.owner)
            
            for grant in PetAccess.objects.filter(pet=event.pet, is_active=True):
                candidates.add(grant.user)

            # 4. Фильтруем и отправляем
            for user in candidates:
                # А. Проверяем, есть ли у юзера настройки (создаем, если нет)
                settings, _ = NotificationSettings.objects.get_or_create(user=user)

                # Б. Проверяем, хочет ли он уведомление ИМЕННО ЗА ЭТО время
                if settings.reminder_time_minutes != minutes:
                    continue
                
                # В. Проверяем, включена ли эта категорию (медицина/уход/etc)
                # Тут можно добавить маппинг категорий события на настройки
                # Пока для MVP проверяем глобально: если это мед. событие, а юзер отключил медицину - скипаем
                # (Логику маппинга можно расширить позже)

                # Г. Проверка на дубликаты (чтобы не спамить, если таск наложился)
                already_sent = Notification.objects.filter(
                    recipient=user,
                    object_id=event.id,
                    content_type__model='petevent',
                    metadata__trigger=f'timer_{minutes}' # Уникальная метка триггера
                ).exists()

                if already_sent:
                    continue

                # Д. Создаем уведомление
                Notification.objects.create(
                    recipient=user,
                    category='reminder',
                    title=f"Напоминание: {event.title}",
                    message=f"Через {minutes} мин.: {event.event_type.name} для {event.pet.name}",
                    content_object=event,
                    metadata={
                        "event_date": str(event.date),
                        "trigger": f'timer_{minutes}', # Важно для дедупликации
                        "link": f"/dashboard?pet={event.pet.id}&event={event.id}" # Ссылка для фронта
                    }
                )

@shared_task
def process_repeating_events():
    """
    Обработка поля `next_date`.
    Запускается раз в сутки (например, в 09:00 утра).
    Ищет события, у которых сегодня `next_date`, и напоминает создать новое.
    """
    now = timezone.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    # Ищем события, у которых next_date попадает в сегодня
    events_to_repeat = PetEvent.objects.filter(
        next_date__range=(start_of_day, end_of_day)
    ).select_related('pet__owner', 'event_type')

    for event in events_to_repeat:
        recipients = set()
        if event.pet.owner: recipients.add(event.pet.owner)
        for grant in PetAccess.objects.filter(pet=event.pet, is_active=True):
            recipients.add(grant.user)

        for user in recipients:
             # Проверка дублей (один раз в день)
            trigger_id = f'repeat_{event.id}_{now.date()}'
            if Notification.objects.filter(recipient=user, metadata__trigger=trigger_id).exists():
                continue

            Notification.objects.create(
                recipient=user,
                category='action', # Требует действия
                title="Подошел срок повтора",
                message=f"Сегодня нужно повторить процедуру: {event.event_type.name} ({event.title}). Нажмите, чтобы запланировать.",
                content_object=event,
                metadata={
                    "trigger": trigger_id,
                    "is_repeat_alert": True,
                    "actions": [{
                        "label": "Запланировать сейчас",
                        "api_call": f"/api/events/{event.id}/duplicate/", # Эндпоинт нужно будет реализовать
                        "type": "button",
                        "style": "primary"
                    }]
                }
            )