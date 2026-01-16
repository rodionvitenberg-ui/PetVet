from django.db import models
from django.conf import settings

class ChatRoom(models.Model):
    """
    Чат-комната, привязанная к конкретному питомцу и врачу.
    """
    pet = models.ForeignKey(
        'pets.Pet', 
        on_delete=models.CASCADE, 
        related_name='chat_rooms',
        verbose_name="Питомец"
    )
    vet = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='vet_chats',
        verbose_name="Ветеринар"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='owner_chats',
        verbose_name="Владелец"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # Для сортировки списка чатов по свежести
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        # У одного врача с одним питомцем может быть только один чат
        unique_together = ('pet', 'vet') 
        verbose_name = "Чат-комната"
        verbose_name_plural = "Чат-комнаты"
        ordering = ['-updated_at']

    def __str__(self):
        return f"Chat: {self.vet.username} <-> {self.owner.username} ({self.pet.name})"

class ChatMessage(models.Model):
    room = models.ForeignKey(
        ChatRoom, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    text = models.TextField(verbose_name="Текст сообщения")
    
    # Возможность прикрепить файл (опционально)
    attachment = models.FileField(upload_to='chat_attachments/%Y/%m/', null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at'] # Хронологический порядок
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"

    def __str__(self):
        return f"{self.sender.username}: {self.text[:20]}"