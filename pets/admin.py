from django.contrib import admin
from django import forms
from django.utils.safestring import mark_safe
from .models import Category, Pet, Attribute, PetAttribute, Tag, PetImage, HealthEvent

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
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
class AttributeAdmin(admin.ModelAdmin):
    # Добавили 'icon_preview' в список
    list_display = ('name', 'unit', 'sort_order', 'icon_preview')
    list_editable = ('sort_order',) 
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

    # Функция превью для атрибутов
    def icon_preview(self, obj):
        if obj.icon:
            return mark_safe(f'<img src="{obj.icon.url}" width="30" height="30" />')
        return "-"
    icon_preview.short_description = "Иконка"

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    verbose_name = "Метка"
    verbose_name_plural = "Метки"
    # Добавили 'icon_preview' в список
    list_display = ('name', 'slug', 'target_gender', 'sort_order', 'icon_preview')
    list_editable = ('sort_order',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('target_gender',)

    # Функция превью для тегов
    def icon_preview(self, obj):
        if obj.icon:
            return mark_safe(f'<img src="{obj.icon.url}" width="30" height="30" />')
        return "-"
    icon_preview.short_description = "Иконка"

# ... (Остальные классы PetAdmin, HealthEventAdmin и т.д. оставляем без изменений)
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
    fields = ('event_type', 'title', 'date', 'status', 'is_verified')
    readonly_fields = ('is_verified',)
    show_change_link = True

class PetAdminForm(forms.ModelForm):
    class Meta:
        model = Pet
        fields = '__all__'
        widgets = {
            'birth_date': admin.widgets.AdminDateWidget(attrs={'type': 'date'}),
        }

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    form = PetAdminForm
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
    list_display = ('title', 'pet', 'event_type', 'date', 'status', 'is_verified')
    list_filter = ('event_type', 'status', 'is_verified', 'date')
    search_fields = ('title', 'pet__name', 'description')
    date_hierarchy = 'date'
    autocomplete_fields = ['pet']