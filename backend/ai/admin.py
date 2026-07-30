from django.contrib import admin
from .models import SystemPrompt, AIChatSession, AIChatMessage


@admin.register(SystemPrompt)
class SystemPromptAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_default', 'updated_at', 'created_at']
    list_editable = ['is_default']
    search_fields = ['name']
    list_filter = ['is_default']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {
            'fields': ('name', 'content', 'is_default')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AIChatSession)
class AIChatSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'pet', 'title', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'user__username', 'pet__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'pet', 'system_prompt']


@admin.register(AIChatMessage)
class AIChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'role', 'content_preview', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['content']
    readonly_fields = ['created_at']
    raw_id_fields = ['session']

    def content_preview(self, obj):
        return obj.content[:100] + ('...' if len(obj.content) > 100 else '')
    content_preview.short_description = 'Content'