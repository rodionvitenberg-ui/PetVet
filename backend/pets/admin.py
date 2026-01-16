from django.contrib import admin
from modeltranslation.admin import TranslationAdmin
from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import format_html
from .models import Category, Pet, Attribute, PetAttribute, Tag, PetImage, HealthEvent

# === CUSTOM FILTERS & ACTIONS ===

class ScopeFilter(admin.SimpleListFilter):
    """Фильтр для разделения Системных и Пользовательских записей"""
    title = 'Область видимости (Scope)'
    parameter_name = 'scope'

    def lookups(self, request, model_admin):
        return (
            ('system', '🔒 Системные (Global)'),
            ('custom', '👤 Пользовательские (Custom)'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'system':
            return queryset.filter(created_by__isnull=True)
        if self.value() == 'custom':
            return queryset.filter(created_by__isnull=False)
        return queryset

@admin.action(description='🚀 ПРОМОУШЕН: Сделать выбранные системными')
def promote_to_system(modeladmin, request, queryset):
    """
    Убирает автора у записей, делая их системными (общими).
    """
    rows_updated = queryset.update(created_by=None)
    modeladmin.message_user(request, f"Успешно обновлено записей: {rows_updated}. Теперь они системные.")

# === ADMIN CLASSES ===

@admin.register(Category)
class CategoryAdmin(TranslationAdmin):
    list_display = ('name', 'parent', 'slug', 'sort_order', 'icon_preview')
    list_editable = ('sort_order',)
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    filter_horizontal = ('tags', 'attributes')

    def icon_preview(self, obj):
        if obj.icon:
            # Здесь mark_safe используется корректно
            return mark_safe(f'<img src="{obj.icon.url}" width="30" height="30" />')
        return "-"
    icon_preview.short_description = "Иконка"

@admin.register(Attribute)
class AttributeAdmin(TranslationAdmin):
    list_display = ('name', 'unit', 'type_label', 'is_universal', 'sort_order', 'icon_preview')
    list_editable = ('sort_order',) 
    list_filter = (ScopeFilter, 'is_universal')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    actions = [promote_to_system]
    readonly_fields = ('created_by',)

    def type_label(self, obj):
        if obj.created_by:
            # Тут format_html нужен, так как есть аргумент obj.created_by
            return format_html(
                '<span style="color: orange; font-weight: bold;">👤 Custom</span> <span style="color: #999; font-size: 10px;">({})</span>', 
                obj.created_by
            )
        # [FIX] Тут была ошибка. Для статики используем mark_safe
        return mark_safe('<span style="color: green; font-weight: bold;">🔒 System</span>')
    type_label.short_description = "Тип"

    def icon_preview(self, obj):
        if obj.icon:
            return mark_safe(f'<img src="{obj.icon.url}" width="30" height="30" />')
        return "-"
    icon_preview.short_description = "Иконка"

@admin.register(Tag)
class TagAdmin(TranslationAdmin):
    list_display = ('name', 'slug', 'type_label', 'is_universal', 'target_gender', 'sort_order')
    list_editable = ('sort_order', 'target_gender') 
    list_filter = (ScopeFilter, 'is_universal', 'target_gender')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    actions = [promote_to_system]
    readonly_fields = ('created_by',)

    def type_label(self, obj):
        if obj.created_by:
            # [FIX] Добавил вывод автора (как в атрибутах), чтобы format_html имел аргументы
            return format_html(
                '<span style="color: orange; font-weight: bold;">👤 Custom</span> <span style="color: #999; font-size: 10px;">({})</span>', 
                obj.created_by
            )
        # [FIX] Заменил format_html на mark_safe
        return mark_safe('<span style="color: green; font-weight: bold;">🔒 System</span>')
    type_label.short_description = "Тип"

# === INLINES & OTHER ===

class PetAttributeInline(admin.TabularInline):
    model = PetAttribute
    extra = 1
    autocomplete_fields = ['attribute']

class PetImageInline(admin.TabularInline):
    model = PetImage
    extra = 1

class HealthEventInline(admin.TabularInline):
    model = HealthEvent
    extra = 0
    show_change_link = True

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    autocomplete_fields = ['categories', 'owner', 'mother', 'father']
    filter_horizontal = ('categories', 'tags') 
    list_display = ('name', 'owner', 'gender', 'birth_date', 'get_categories', 'is_active', 'is_public', 'created_at')
    list_filter = ('is_active', 'gender', 'categories', 'is_public', 'tags')
    search_fields = ('name', 'description', 'owner__username', 'owner__email')
    inlines = [PetAttributeInline, PetImageInline, HealthEventInline]
    prepopulated_fields = {'slug': ('name',)}
    
    fieldsets = (
        ('Основное', {
            'fields': ('owner', 'name', 'gender', 'birth_date', 'slug', 'is_active', 'is_public', 'description')
        }),
        ('Родословная', {
            'fields': ('mother', 'father'),
            'description': 'Родители должны быть старше ребенка. Мама - только девочки, Папа - только мальчики.'
        }),
        ('Классификация', {
            'fields': ('categories', 'tags'),
        }),
    )

    def get_categories(self, obj):
        return ", ".join([c.name for c in obj.categories.all()])
    get_categories.short_description = "Категории"

@admin.register(HealthEvent)
class HealthEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'pet', 'event_type', 'date', 'status', 'next_date')
    list_filter = ('event_type', 'status', 'date')
    search_fields = ('title', 'pet__name', 'description')
    autocomplete_fields = ['pet']
    date_hierarchy = 'date'