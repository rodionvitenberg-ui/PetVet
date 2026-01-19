from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import NotificationSerializer

def send_notification_to_user(notification):
    """
    Главный маршрутизатор уведомлений.
    Решает, куда отправить уведомление (WS, Push, Email) на основе настроек юзера.
    """
    user = notification.recipient
    
    # 1. Получаем настройки (безопасно)
    try:
        settings = user.notification_settings
    except Exception:
        # Если настроек нет, считаем, что все включено (или создаем дефолтные)
        from .models import NotificationSettings
        settings, _ = NotificationSettings.objects.get_or_create(user=user)

    # 2. Проверка Категорий (Content Filter)
    # Если пользователь отключил "Медицину", мы не должны его беспокоить всплывашками.
    # Но в Истории (в базе) уведомление останется.
    allow_alert = True
    
    if notification.category == 'medical' and not settings.notify_medical:
        allow_alert = False
    elif notification.category == 'care' and not settings.notify_care:
        allow_alert = False
    elif notification.category == 'reproduction' and not settings.notify_reproduction:
        allow_alert = False
    elif notification.category == 'system' and not settings.notify_system:
        allow_alert = False

    # Если категория заглушена пользователем — выходим, не отправляя сигналов
    if not allow_alert:
        return

    # 3. Маршрутизация по Каналам (Channels)
    
    # --- Канал 1: Браузер / Desktop (WebSocket) ---
    if settings.browser_enabled:
        send_websocket(notification, settings.sound_enabled)

    # --- Канал 2: Мобильный Пуш (FCM) ---
    if settings.push_enabled:
        # Здесь будет вызов функции отправки в Firebase
        # send_fcm_push(notification)
        pass

    # --- Канал 3: Email ---
    if settings.email_enabled:
        # send_email(notification)
        pass

def send_websocket(notification, sound_enabled):
    """Отправка через Django Channels"""
    channel_layer = get_channel_layer()
    group_name = f"user_{notification.recipient.id}"

    try:
        # Сериализуем данные
        serializer = NotificationSerializer(notification)
        data = serializer.data
        
        # Добавляем флаг звука (чтобы фронт знал, играть или нет)
        data['play_sound'] = sound_enabled

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "send_notification",
                "data": data
            }
        )
    except Exception as e:
        print(f"Error sending WS notification: {e}")