from django.db import models
from django.conf import settings


class VetClinic(models.Model):
    """
    A veterinary clinic. Created by a veterinarian (is_veterinarian=True).
    The creator becomes the admin of the clinic.
    """
    name = models.CharField(max_length=300)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_clinics'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Veterinary Clinic"
        verbose_name_plural = "Veterinary Clinics"
        ordering = ['name']

    def __str__(self):
        return self.name


class ClinicMember(models.Model):
    """
    Membership of a user in a clinic.
    Admin = the creator of the clinic. Can invite/remove members.
    Member = invited veterinarian. Can see and manage patients of the clinic.
    """
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        MEMBER = 'member', 'Member'

    clinic = models.ForeignKey(
        VetClinic,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clinic_memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Clinic Member"
        verbose_name_plural = "Clinic Members"
        unique_together = ('clinic', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} — {self.clinic.name} ({self.get_role_display()})"


class ExamTemplate(models.Model):
    """
    Pre-filled examination template for a clinic.
    Vet selects a template when creating a PetEvent — fields auto-fill.
    """
    clinic = models.ForeignKey(
        VetClinic,
        on_delete=models.CASCADE,
        related_name='exam_templates'
    )
    name = models.CharField(max_length=200)
    category = models.CharField(
        max_length=20,
        choices=[
            ('examination', 'Examination'),
            ('vaccination', 'Vaccination'),
            ('surgery', 'Surgery'),
            ('parasite', 'Parasite Treatment'),
            ('grooming', 'Grooming'),
            ('laboratory', 'Laboratory'),
            ('other', 'Other'),
        ],
        default='examination'
    )
    default_fields = models.JSONField(
        default=dict,
        blank=True,
        help_text="Pre-filled event fields: title, description, data (JSON), status, next_date_days"
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_exam_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Exam Template"
        verbose_name_plural = "Exam Templates"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.clinic.name}: {self.name}"


class ClinicInvite(models.Model):
    """
    One-time invite link from a clinic admin to a veterinarian.
    """
    clinic = models.ForeignKey(
        VetClinic,
        on_delete=models.CASCADE,
        related_name='invites'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_invites'
    )
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Clinic Invite"
        verbose_name_plural = "Clinic Invites"

    def __str__(self):
        return f"Invite to {self.clinic.name} ({'used' if self.is_used else 'active'})"