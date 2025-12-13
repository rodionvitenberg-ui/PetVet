from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class Notification(models.Model):
    """
    Универсальная система уведомлений.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Получатель"
    )

    CATEGORY_CHOICES = [
        ('system', 'Системное'),         # "Добро пожаловать"
        ('reminder', 'Напоминание'),     # "Завтра прививка"
        ('medical', 'Медицина'),         # "Врач добавил запись"
        ('action', 'Требует действия'),  # "Операция состоялась? (Да/Нет)"
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='system')

    title = models.CharField(max_length=255, verbose_name="Заголовок")
    message = models.TextField(verbose_name="Сообщение")
    
    # ССЫЛКА НА ОБЪЕКТ (Generic Relation)
    # Это позволяет ссылаться на HealthEvent, Pet или что угодно
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    # Статус прочтения
    is_read = models.BooleanField(default=False, verbose_name="Прочитано")
    
    # JSON поле для мета-данных (например, ссылки на кнопки действия)
    # Если ты используешь PostgreSQL, лучше использовать models.JSONField
    # Если SQLite (для старта), то пока оставим текстовым или просто опустим, 
    # но для "Actionable" уведомлений оно пригодится.
    # Пока обойдемся без него, реализуем логику через category='action'.

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"

    def __str__(self):
        return f"{self.recipient} - {self.title}"