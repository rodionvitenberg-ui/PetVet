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

class Reminder(models.Model):
    """
    Scheduled reminders for pet events (vaccinations, checkups, etc.)
    Checked by Celery beat tasks to send email/push notifications.
    """
    EVENT_TYPE_CHOICES = [
        ('vaccination', 'Vaccination'),
        ('checkup', 'Checkup'),
        ('parasite', 'Parasite treatment'),
        ('medication', 'Medication'),
        ('grooming', 'Grooming'),
        ('reproduction', 'Reproduction'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name="User"
    )
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name="Pet"
    )
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default='other',
        verbose_name="Event type"
    )
    title = models.CharField(max_length=300, verbose_name="Title")
    due_date = models.DateField(verbose_name="Due date", db_index=True)
    is_recurring = models.BooleanField(default=False, verbose_name="Recurring")
    interval_days = models.IntegerField(null=True, blank=True, verbose_name="Repeat every N days")
    notification_sent = models.BooleanField(default=False, verbose_name="Notification sent")
    created_by_event = models.ForeignKey(
        'pets.PetEvent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reminders',
        verbose_name="Source event"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reminder"
        verbose_name_plural = "Reminders"
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['due_date', 'notification_sent']),
        ]

    def __str__(self):
        return f"{self.pet.name}: {self.title} on {self.due_date}"


class NotificationSettings(models.Model):
    """
    Личные настройки уведомлений пользователя.
    """
    REMINDER_CHOICES = [
        (15, '15 minutes before'),
        (60, '1 hour before'),
        (1440, '1 day before'),
        (4320, '3 days before'),
        (10080, '7 days before'),
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