# backend/users/urls.py

from django.urls import path
from .views import RegisterView, UserMeView  # <-- Не забудь импортировать UserMeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', UserMeView.as_view(), name='user_me'),  # <-- Добавляем сюда
]