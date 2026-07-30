from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class SystemPrompt(models.Model):
    """
    Configurable system prompt for AI assistant behavior.
    Managed via admin panel. Use {pet_context} placeholder
    to inject pet profile data at runtime.
    """
    name = models.CharField(max_length=200, unique=True)
    content = models.TextField(
        help_text="Use {pet_context} placeholder to inject pet profile data at runtime"
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Only one prompt can be the default at a time"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Prompt"
        verbose_name_plural = "System Prompts"
        ordering = ['-is_default', 'name']

    def __str__(self):
        default_marker = " ★" if self.is_default else ""
        return f"{self.name}{default_marker}"

    def clean(self):
        if self.is_default:
            # Ensure no other prompt is default
            existing = SystemPrompt.objects.filter(is_default=True).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError(
                    f"Another default prompt already exists: {existing.first().name}. "
                    f"Uncheck 'is_default' there first."
                )

    def save(self, *args, **kwargs):
        if self.is_default:
            # Unset default on all other prompts
            SystemPrompt.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class AIChatSession(models.Model):
    """
    One continuous dialog between a user and AI about a specific pet.
    Invariant: one session = one pet.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ai_sessions'
    )
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='ai_sessions'
    )
    system_prompt = models.ForeignKey(
        SystemPrompt,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions'
    )
    title = models.CharField(
        max_length=200,
        help_text="Auto-generated from the first user question"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Chat Session"
        verbose_name_plural = "AI Chat Sessions"
        ordering = ['-updated_at']

    def __str__(self):
        return f"AI: {self.user.username} → {self.pet.name} ({self.title[:40]}...)"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()


class AIChatMessage(models.Model):
    """
    A single message in an AI chat session.
    Role is either 'user' (the pet owner) or 'assistant' (AI).
    """
    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'

    session = models.ForeignKey(
        AIChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        db_index=True
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "AI Chat Message"
        verbose_name_plural = "AI Chat Messages"
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:60]}..."