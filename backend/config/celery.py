import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Лучше использовать имя папки конфига, чтобы совпадало с запуском -A config
app = Celery('config') 

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Планировщик лучше (но не обязательно) вынести в settings.py, 
# но если он тут — убедись, что таск 'notifications.tasks.send_scheduled_reminders' реально существует.
app.conf.beat_schedule = {
    'send-reminders-every-hour': {
        'task': 'notifications.tasks.send_scheduled_reminders',
        'schedule': 3600.0,
    },
}

app.conf.beat_schedule = {
    # 1. "Гибкие напоминания": Запускаем каждую минуту.
    # Так мы поймаем и тех, кто хочет за 15 мин, и тех, кто за 24 часа.
    'check-flexible-reminders-every-minute': {
        'task': 'notifications.tasks.send_flexible_reminders',
        'schedule': 60.0, # 60 секунд
    },

    # 2. "Повторы": Запускаем раз в день утром (например, в 9:00).
    'check-repeating-events-daily': {
        'task': 'notifications.tasks.process_repeating_events',
        'schedule': crontab(hour=9, minute=0),
    },
}