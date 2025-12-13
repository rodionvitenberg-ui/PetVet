from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PetViewSet, CategoryViewSet, AttributeViewSet, HealthEventViewSet

# Создаем роутер
router = DefaultRouter()

# 1. Питомцы
# Доступные URL:
# GET /api/pets/ - Список своих питомцев
# POST /api/pets/ - Создать питомца (с вложенными атрибутами и тегами)
# GET /api/pets/{slug}/ - Детальная карточка
router.register(r'pets', PetViewSet, basename='pet')

# 2. Категории (Виды животных)
# GET /api/categories/
# GET /api/categories/{id}/filters/ - Фильтры для поиска
# GET /api/categories/{id}/tags/ - Доступные метки
router.register(r'categories', CategoryViewSet, basename='category')

# 3. Атрибуты (Справочник)
# GET /api/attributes/
router.register(r'attributes', AttributeViewSet, basename='attribute')

# 4. Медицинская карта / События (НОВОЕ)
# GET /api/events/ - Список всех событий (прививки, вес)
# POST /api/events/ - Добавить запись
router.register(r'events', HealthEventViewSet, basename='event')

urlpatterns = [
    # Включаем все URL, сгенерированные роутером
    path('', include(router.urls)),
]