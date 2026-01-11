from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Кастомная модель пользователя.
    """
    is_veterinarian = models.BooleanField(
        default=False, 
        help_text="Отметьте, если пользователь является ветеринаром"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Прошел ли врач проверку документов"
    )
    
    # Личные контакты (видны врачу у владельца)
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Личный телефон")
    
    # Рабочие контакты (видны владельцу у врача)
    work_phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Рабочий телефон", help_text="Для ветеринаров")
    telegram = models.CharField(max_length=50, blank=True, null=True, verbose_name="Telegram username")
    
    clinic_name = models.CharField(max_length=255, blank=True, null=True, help_text="Только для врачей")
    city = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.ImageField(upload_to='users_avatars/', null=True, blank=True)
    
    # Описание (Специализация врача или заметка о владельце)
    about = models.TextField(blank=True, null=True, verbose_name="О себе / Специализация")
    
    def __str__(self):
        role = "Vet" if self.is_veterinarian else "Owner"
        status = "✅" if self.is_verified else "⏳" if self.is_veterinarian else ""
        return f"{self.username} ({role} {status})"
    
class UserContact(models.Model):
    CONTACT_TYPES = [
        ('phone', 'Телефон'),
        ('whatsapp', 'WhatsApp'),
        ('telegram', 'Telegram'),
        ('instagram', 'Instagram'),
        ('email', 'Email'),
        ('site', 'Сайт'),
        ('vk', 'VK'),
        ('other', 'Другое'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    type = models.CharField(max_length=20, choices=CONTACT_TYPES, default='phone')
    value = models.CharField(max_length=255, help_text="Номер телефона, никнейм или ссылка")
    label = models.CharField(max_length=50, blank=True, null=True, help_text="Например: 'Рабочий', 'Личный', 'Для записи'")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()}: {self.value} ({self.user.username})"