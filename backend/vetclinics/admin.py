from django.contrib import admin
from .models import VetClinic, ClinicMember, ClinicInvite, ExamTemplate


@admin.register(VetClinic)
class VetClinicAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'phone', 'email']
    raw_id_fields = ['created_by']


@admin.register(ClinicMember)
class ClinicMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'clinic', 'role', 'joined_at']
    list_filter = ['role']
    search_fields = ['user__username', 'clinic__name']
    raw_id_fields = ['user', 'clinic']


@admin.register(ExamTemplate)
class ExamTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'clinic', 'category', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'clinic']
    search_fields = ['name', 'clinic__name']
    raw_id_fields = ['clinic', 'created_by']


@admin.register(ClinicInvite)
class ClinicInviteAdmin(admin.ModelAdmin):
    list_display = ['clinic', 'token_preview', 'created_by', 'is_used', 'created_at']
    list_filter = ['is_used']
    raw_id_fields = ['clinic', 'created_by']

    def token_preview(self, obj):
        return obj.token[:16] + '...'
    token_preview.short_description = 'Token'