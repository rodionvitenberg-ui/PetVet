from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

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