# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import HealthEvent, Tag

@receiver(post_save, sender=HealthEvent)
def handle_event_completion(sender, instance, created, **kwargs):
    """
    Срабатывает при сохранении события.
    Если статус 'completed', проверяем, нужно ли присвоить тег (например, 'Стерилизован').
    """
    # Если событие не завершено, мы ничего не делаем
    if instance.status != 'completed':
        return

    # Нормализуем текст для поиска (в нижний регистр)
    title_lower = instance.title.lower()
    
    # Ключевые слова для стерилизации
    sterilization_keywords = ['кастрация', 'стерилизация', 'castration', 'sterilization', 'neutering']
    
    # Логика 1: Стерилизация
    if any(word in title_lower for word in sterilization_keywords):
        # Определяем пол для тега
        target_gender = None
        if instance.pet.gender == 'M':
            target_gender = 'M'
        elif instance.pet.gender == 'F':
            target_gender = 'F'

        # Создаем или находим тег
        tag, _ = Tag.objects.get_or_create(
            slug='sterilized',
            defaults={
                'name': "Стерилизован(а)",
                'target_gender': target_gender,
                'sort_order': 10
            }
        )
        
        # Добавляем тег питомцу (add делает проверку на дубликаты сам)
        instance.pet.tags.add(tag)
        print(f"✅ SIGNAL: Питомцу {instance.pet.name} присвоен статус '{tag.name}' после события '{instance.title}'")

    # Сюда можно добавить логику для других тегов (например, "Чипирован")