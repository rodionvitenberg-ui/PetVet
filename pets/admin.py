from django.contrib import admin
from django import forms
from django.utils.safestring import mark_safe
from .models import Category, Pet, Attribute, PetAttribute, Tag, PetImage, HealthEvent

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    filter_horizontal = ('tags', 'attributes')

@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    # Добавили sort_order
    list_display = ('name', 'unit', 'sort_order')
    # Позволяет менять порядок прямо в списке, не заходя в карточку!
    list_editable = ('sort_order',) 
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    verbose_name = "Метка"
    verbose_name_plural = "Метки"
    list_display = ('name', 'slug', 'target_gender', 'sort_order')
    list_editable = ('sort_order',)
    list_filter = ('target_gender',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

class PetAdminForm(forms.ModelForm):
    class Meta:
        model = Pet
        fields = '__all__'

class PetAttributeInline(admin.TabularInline):
    model = PetAttribute
    extra = 1
    autocomplete_fields = ['attribute'] 

class PetImageInline(admin.TabularInline):
    model = PetImage
    extra = 1
    readonly_fields = ('image_preview',)

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" style="border-radius: 5px;" />')
        return "Нет изображения"

    image_preview.short_description = "Превью"

class HealthEventInline(admin.TabularInline):
    model = HealthEvent
    extra = 0 # Не показывать пустые строки, пока не нажмешь "Добавить"
    fields = ('date', 'event_type', 'title', 'next_date', 'document')
    readonly_fields = ('created_at',)
    classes = ('collapse',) # Можно свернуть, чтобы не занимало место

# 2. Регистрируем саму модель событий отдельно (чтобы видеть общий список всех прививок всех зверей)
@admin.register(HealthEvent)
class HealthEventAdmin(admin.ModelAdmin):
    list_display = ('pet', 'event_type', 'date', 'created_by', 'title', 'next_date')
    list_filter = ('event_type', 'date', 'created_by', 'pet__categories') # Фильтр по типу и дате
    search_fields = ('pet__name', 'title', 'description')
    date_hierarchy = 'date' # Красивая навигация по датам сверху
    autocomplete_fields = ['pet'] # Важно, если питомцев будет много

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    form = PetAdminForm
    
    # Добавил 'mother' и 'father' в autocomplete, чтобы не листать список из 1000 котов
    autocomplete_fields = ['categories', 'owner', 'mother', 'father']

    filter_horizontal = ('categories', 'tags') 

    list_display = ('name', 'owner', 'gender', 'birth_date', 'get_categories', 'is_active', 'is_public', 'created_at')
    list_filter = ('is_active', 'gender', 'categories', 'is_public', 'tags')
    search_fields = ('name', 'description', 'owner__username', 'owner__email')
    
    inlines = [PetAttributeInline, PetImageInline, HealthEventInline]
    prepopulated_fields = {'slug': ('name',)}
    
    # Обновленная структура карточки
    fieldsets = (
        ('Основное', {
            'fields': ('owner', 'name', 'gender', 'birth_date', 'slug', 'is_active', 'is_public', 'description')
        }),
        ('Родословная', {
            'fields': ('mother', 'father'),
            'description': 'Родители должны быть старше ребенка. Мама - только девочки, Папа - только мальчики.'
        }),
        ('Классификация', {
            'fields': ('categories', 'tags')
        }),
    )

    def get_categories(self, obj):
        return ", ".join([cat.name for cat in obj.categories.all()])
    
    get_categories.short_description = 'Вид / Категория'

