from django.contrib import admin
from modeltranslation.admin import TranslationAdmin
from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import format_html
from .models import Category, Pet, Attribute, PetAttribute, Tag, PetImage, PetEvent, EventType, PetEventAttachment

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
            return mark_safe(f'<img src="{obj.icon.url}" width="30" height="30" />')
        return "-"
    icon_preview.short_description = "Иконка"

@admin.register(Attribute)
class AttributeAdmin(TranslationAdmin):
    # Показываем статус (System/Custom), галочку универсальности и иконку
    list_display = ('name', 'unit', 'type_label', 'is_universal', 'sort_order', 'icon_preview')
    
    # [FIX] Оставляем в editable только безопасные поля, чтобы не конфликтовать с TranslationAdmin
    list_editable = ('sort_order',) 
    
    list_filter = (ScopeFilter, 'is_universal')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    actions = [promote_to_system]
    
    readonly_fields = ('created_by',)

    def type_label(self, obj):
        if obj.created_by:
            # Здесь format_html нужен, так как есть аргументы
            return format_html(
                '<span style="color: orange; font-weight: bold;">👤 Custom</span> <span style="color: #999; font-size: 10px;">({})</span>', 
                obj.created_by
            )
        # [FIX] Для статики используем mark_safe, иначе Django 5+ ругается
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
            return format_html(
                '<span style="color: orange; font-weight: bold;">👤 Custom</span> <span style="color: #999; font-size: 10px;">({})</span>', 
                obj.created_by
            )
        # [FIX] Используем mark_safe
        return mark_safe('<span style="color: green; font-weight: bold;">🔒 System</span>')
    type_label.short_description = "Тип"

# === EVENT TYPES & EVENTS ===

@admin.register(EventType)
class EventTypeAdmin(TranslationAdmin):
    list_display = ('name', 'category', 'type_label', 'is_universal', 'created_by')
    list_filter = ('category', ScopeFilter, 'is_universal')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    actions = [promote_to_system]
    readonly_fields = ('created_by',)

    def type_label(self, obj):
        if obj.created_by:
            return format_html(
                '<span style="color: orange; font-weight: bold;">👤 Custom</span> <span style="color: #999; font-size: 10px;">({})</span>', 
                obj.created_by
            )
        return mark_safe('<span style="color: green; font-weight: bold;">🔒 System</span>')
    type_label.short_description = "Тип"

class PetEventAttachmentInline(admin.TabularInline):
    model = PetEventAttachment
    extra = 1

@admin.register(PetEvent)
class PetEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'pet', 'event_type', 'date', 'status')
    list_filter = ('event_type__category', 'status', 'date')
    search_fields = ('title', 'pet__name', 'description')
    autocomplete_fields = ['pet', 'event_type']
    inlines = [PetEventAttachmentInline]
    date_hierarchy = 'date'

# === INLINES & PET ADMIN ===

class PetAttributeInline(admin.TabularInline):
    model = PetAttribute
    extra = 1
    autocomplete_fields = ['attribute']

class PetImageInline(admin.TabularInline):
    model = PetImage
    extra = 1

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    autocomplete_fields = ['categories', 'owner', 'mother', 'father']
    filter_horizontal = ('categories', 'tags') 
    list_display = ('name', 'owner', 'gender', 'species_breed', 'is_active', 'is_public', 'created_at')
    list_filter = ('is_active', 'gender', 'categories', 'is_public')
    search_fields = ('name', 'description', 'owner__username', 'owner__email')
    # HealthEventInline заменили на отдельную админку событий, но можно вернуть как inline, если нужно
    inlines = [PetAttributeInline, PetImageInline] 
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

    def species_breed(self, obj):
        # Безопасное получение вида и породы
        species = next((c.name for c in obj.categories.all() if c.parent is None), "-")
        breed = next((c.name for c in obj.categories.all() if c.parent is not None), "-")
        return f"{species} / {breed}"
    species_breed.short_description = "Вид / Порода"