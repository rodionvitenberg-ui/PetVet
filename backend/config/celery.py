import os
from celery import Celery

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