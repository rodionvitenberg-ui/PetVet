from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Кастомная модель пользователя.
    """
    # Основные флаги ролей
    is_veterinarian = models.BooleanField(
        default=False, 
        help_text="Отметьте, если пользователь является ветеринаром"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Прошел ли врач проверку документов"
    )
    
    # Дополнительные данные
    phone = models.CharField(max_length=20, blank=True, null=True)
    clinic_name = models.CharField(max_length=255, blank=True, null=True, help_text="Только для врачей")
    city = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.ImageField(upload_to='users_avatars/', null=True, blank=True)
    
    def __str__(self):
        role = "Vet" if self.is_veterinarian else "Owner"
        status = "✅" if self.is_verified else "⏳" if self.is_veterinarian else ""
        return f"{self.username} ({role} {status})"