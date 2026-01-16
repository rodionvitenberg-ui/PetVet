from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PetViewSet, CategoryViewSet, AttributeViewSet, PetEventViewSet, PetEventAttachmentViewSet, TagViewSet, EventTypeViewSet, AIConsultView

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
router.register(r'tags', TagViewSet, basename='tag')

# 4. Медицинская карта / События (НОВОЕ)
# GET /api/events/ - Список всех событий (прививки, вес)
# POST /api/events/ - Добавить запись
router.register(r'events', PetEventViewSet, basename='event')
router.register(r'event-types', EventTypeViewSet, basename='event-type')
router.register(r'event-attachments', PetEventAttachmentViewSet, basename='event-attachment')

urlpatterns = [
    path('ai/consult/', AIConsultView.as_view(), name='ai-consult'),
    path('', include(router.urls)),
]