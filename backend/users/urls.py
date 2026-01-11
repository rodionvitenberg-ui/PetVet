from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, UserMeView, GoogleLoginView, UserContactViewSet

# 1. Создаем роутер для ViewSets
router = DefaultRouter()
# Регистрируем endpoint для контактов: /api/users/contacts/
router.register(r'contacts', UserContactViewSet, basename='user-contacts')

# 2. Обычные пути
urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'),
    path('me/', UserMeView.as_view(), name='user_me'),
    
    # 3. Подключаем роутер. 
    # Это добавит пути для CRUD контактов (GET /contacts/, POST /contacts/ и т.д.)
    path('', include(router.urls)),
]