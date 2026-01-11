from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import VetVerificationRequest

@receiver(post_save, sender=VetVerificationRequest)
def handle_verification_status(sender, instance, created, **kwargs):
    # Если заявка только создана - ничего не делаем, ждем решения админа
    if created:
        return

    user = instance.user
    
    if instance.status == 'approved':
        # 1. Подтверждаем подлинность
        user.is_verified = True
        
        # 2. Если вдруг это был обычный владелец, который решил стать врачом — выдаем роль
        if not user.is_veterinarian:
            user.is_veterinarian = True
            
        user.save()
        
        # Тут можно отправить уведомление: "Ваш статус подтвержден!"

    elif instance.status == 'rejected':
        # При отказе мы снимаем галочку верификации
        user.is_verified = False
        
        # ВАЖНО: Мы НЕ снимаем роль is_veterinarian автоматически.
        # Если человек зарегистрировался как врач, но загрузил плохое фото,
        # пусть он останется врачом (неверифицированным), чтобы мог попробовать снова.
        user.save()