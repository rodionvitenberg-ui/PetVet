from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin
from .models import User, VetVerificationRequest

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Добавляем секцию с нашими полями в форму редактирования
    fieldsets = UserAdmin.fieldsets + (
        ('PetVet Info', {'fields': ('is_veterinarian', 'is_verified', 'clinic_name', 'city', 'phone', 'avatar')}),
    )
    
    # Колонки в таблице списка
    list_display = ('username', 'email', 'is_veterinarian', 'clinic_name', 'is_verified', 'date_joined')
    
    # Фильтры справа
    list_filter = ('is_veterinarian', 'is_verified', 'is_staff', 'date_joined')
    
    # Поиск
    search_fields = ('username', 'email', 'clinic_name', 'last_name')

@admin.register(VetVerificationRequest)
class VetVerificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'status_badge', 'created_at', 'preview_document')
    list_filter = ('status', 'created_at')
    readonly_fields = ('preview_document_large',)
    actions = ['approve_requests', 'reject_requests']

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red'
        }
        return format_html(
            '<span style="color: white; background-color: {}; padding: 3px 10px; border-radius: 10px; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = "Статус"

    def preview_document(self, obj):
        if obj.document_image:
            return format_html('<a href="{}" target="_blank"><img src="{}" style="height: 50px; border-radius: 5px;" /></a>', obj.document_image.url, obj.document_image.url)
        return "-"
    preview_document.short_description = "Документ"

    def preview_document_large(self, obj):
        if obj.document_image:
            return format_html('<a href="{}" target="_blank"><img src="{}" style="max-height: 400px;" /></a>', obj.document_image.url, obj.document_image.url)
        return "-"
    preview_document_large.short_description = "Просмотр документа"

    # Массовые действия
    @admin.action(description='Одобрить выбранные заявки')
    def approve_requests(self, request, queryset):
        for req in queryset:
            req.status = 'approved'
            req.save() # Вызовет сигнал и обновит User

    @admin.action(description='Отклонить выбранные заявки')
    def reject_requests(self, request, queryset):
        queryset.update(status='rejected')