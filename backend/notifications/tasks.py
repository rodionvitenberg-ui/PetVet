from celery import shared_task
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Q
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from pets.models import PetEvent, PetAccess
from .models import Notification, NotificationSettings, Reminder


@shared_task
def send_reminder_emails():
    """
    Daily task: find Reminders due in the next 7, 3, and 1 days,
    and send email notifications to pet owners.
    Runs once per hour (to avoid missing the window).
    """
    today = date.today()
    windows = [1, 3, 7]  # days before due_date

    for days_before in windows:
        target_date = today + timedelta(days=days_before)
        reminders = Reminder.objects.filter(
            due_date=target_date,
            notification_sent=False,
        ).select_related('user', 'pet')

        for reminder in reminders:
            # Check user's notification settings
            settings_obj, _ = NotificationSettings.objects.get_or_create(
                user=reminder.user
            )
            if not settings_obj.email_enabled:
                continue

            # Send email
            try:
                subject = f"PetVet Reminder: {reminder.title} — {reminder.pet.name}"
                html_message = render_to_string('emails/reminder.html', {
                    'user': reminder.user,
                    'pet': reminder.pet,
                    'reminder': reminder,
                    'days_before': days_before,
                    'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
                })
                send_mail(
                    subject=subject,
                    message='',
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@petvet.local'),
                    recipient_list=[reminder.user.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except Exception:
                pass  # Don't crash the whole batch

            # Create in-app notification
            Notification.objects.create(
                recipient=reminder.user,
                category='reminder',
                title=f"Upcoming: {reminder.title}",
                message=f"In {days_before} day(s): {reminder.title} for {reminder.pet.name}",
                object_id=reminder.pet.id,
                content_type_id=None,
                metadata={
                    'reminder_id': reminder.id,
                    'pet_id': reminder.pet.id,
                    'event_type': reminder.event_type,
                    'due_date': str(reminder.due_date),
                    'days_before': days_before,
                    'link': f"/dashboard?pet={reminder.pet.id}",
                }
            )

            # If the reminder is due within 1 day, mark as sent
            if days_before == 1:
                reminder.notification_sent = True
                reminder.save(update_fields=['notification_sent'])


@shared_task
def send_flexible_reminders():
    """
    Smart reminder dispatch. Runs every minute.
    Checks user NotificationSettings and sends in-app notifications
    for upcoming PetEvent instances.
    """
    now = timezone.now()

    # 1. Get unique reminder time preferences from active users
    active_times = NotificationSettings.objects.values_list(
        'reminder_time_minutes', flat=True
    ).distinct()

    for minutes in active_times:
        # Find events starting in exactly `minutes` (±1 min window)
        target_time_start = now + timedelta(minutes=minutes)
        target_time_end = target_time_start + timedelta(minutes=1)

        events = PetEvent.objects.filter(
            date__range=(target_time_start, target_time_end),
            status='planned'
        ).select_related('pet__owner', 'event_type')

        for event in events:
            # Collect recipients
            candidates = set()
            if event.pet.owner:
                candidates.add(event.pet.owner)

            for grant in PetAccess.objects.filter(pet=event.pet, is_active=True):
                candidates.add(grant.user)

            for user in candidates:
                settings_obj, _ = NotificationSettings.objects.get_or_create(user=user)

                if settings_obj.reminder_time_minutes != minutes:
                    continue

                # Deduplicate
                trigger_id = f'timer_{minutes}'
                already_sent = Notification.objects.filter(
                    recipient=user,
                    object_id=event.id,
                    metadata__trigger=trigger_id,
                ).exists()

                if already_sent:
                    continue

                Notification.objects.create(
                    recipient=user,
                    category='reminder',
                    title=f"Reminder: {event.title}",
                    message=f"In {minutes} min: {event.event_type.name} for {event.pet.name}",
                    content_object=event,
                    metadata={
                        "event_date": str(event.date),
                        "trigger": trigger_id,
                        "link": f"/dashboard?pet={event.pet.id}&event={event.id}",
                    }
                )


@shared_task
def process_repeating_events():
    """
    Handle recurring event logic via `next_date`.
    Runs once daily (e.g. 09:00 AM).
    Finds events where next_date falls today, and reminds the user
    to schedule the next occurrence.
    """
    now = timezone.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    events_to_repeat = PetEvent.objects.filter(
        next_date__range=(start_of_day, end_of_day)
    ).select_related('pet__owner', 'event_type')

    for event in events_to_repeat:
        recipients = set()
        if event.pet.owner:
            recipients.add(event.pet.owner)
        for grant in PetAccess.objects.filter(pet=event.pet, is_active=True):
            recipients.add(grant.user)

        for user in recipients:
            trigger_id = f'repeat_{event.id}_{now.date()}'
            if Notification.objects.filter(
                recipient=user, metadata__trigger=trigger_id
            ).exists():
                continue

            Notification.objects.create(
                recipient=user,
                category='action',
                title="Repeat due",
                message=f"Today is the day to repeat: {event.event_type.name} ({event.title}). Tap to schedule.",
                content_object=event,
                metadata={
                    "trigger": trigger_id,
                    "is_repeat_alert": True,
                    "actions": [{
                        "label": "Schedule now",
                        "api_call": f"/api/events/{event.id}/duplicate/",
                        "type": "button",
                        "style": "primary"
                    }]
                }
            )