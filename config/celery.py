import os
from celery import Celery

# Указываем Django настройки по умолчанию
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('petvet')

# Загружаем настройки из settings.py, всё, что начинается с CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматически находить tasks.py в приложениях (pets, notifications и т.д.)
app.autodiscover_tasks()