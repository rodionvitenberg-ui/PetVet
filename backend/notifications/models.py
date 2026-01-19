from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Получатель"
    )
    CATEGORY_CHOICES = [
        ('system', 'Системное'),
        ('reminder', 'Напоминание'),
        ('medical', 'Медицина'),
        ('reproduction', 'Репродукция'),
        ('show', 'Выставки'),
        ('care', 'Уход'),
        ('action', 'Требует действия'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='system')
    title = models.CharField(max_length=255, verbose_name="Заголовок")
    message = models.TextField(verbose_name="Сообщение")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    is_read = models.BooleanField(default=False, verbose_name="Прочитано")
    metadata = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class NotificationSettings(models.Model):
    """
    Личные настройки уведомлений пользователя.
    """
    REMINDER_CHOICES = [
        (15, 'За 15 минут'),
        (30, 'За 30 минут'),
        (60, 'За 1 час'),
        (120, 'За 2 часа'),
        (1440, 'За 24 часа (1 день)'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings'
    )

    email_enabled = models.BooleanField(default=False, verbose_name="Email уведомления")
    push_enabled = models.BooleanField(default=True, verbose_name="Push уведомления (Мобильные)")
    browser_enabled = models.BooleanField(default=True, verbose_name="В браузере (Колокольчик)")

    sound_enabled = models.BooleanField(default=True, verbose_name="Звук уведомлений")
    
    notify_medical = models.BooleanField(default=True, verbose_name="Медицинские события")
    notify_care = models.BooleanField(default=True, verbose_name="Уход и Груминг")
    notify_reproduction = models.BooleanField(default=True, verbose_name="Репродукция")
    notify_system = models.BooleanField(default=True, verbose_name="Системные новости")

    reminder_time_minutes = models.IntegerField(
        choices=REMINDER_CHOICES, 
        default=1440, 
        verbose_name="За сколько напоминать"
    )

    def __str__(self):
        return f"Settings for {self.user}"