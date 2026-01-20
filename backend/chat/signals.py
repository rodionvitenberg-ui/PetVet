from django.db.models.signals import post_save
from django.dispatch import receiver
from pets.models import PetAccess  # Импортируем модель доступа
from .models import ChatRoom       # Импортируем нашу модель чата

@receiver(post_save, sender=PetAccess)
def create_chat_room_on_access(sender, instance, created, **kwargs):
    """
    Автоматически создает чат-комнату, когда врачу предоставляется доступ к питомцу.
    """
    if created:
        
        ChatRoom.objects.get_or_create(
            pet=instance.pet,
            vet=instance.user, 
            defaults={
                'owner': instance.pet.owner
            }
        )