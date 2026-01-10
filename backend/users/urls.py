from django.urls import path
from .views import RegisterView, UserMeView, GoogleLoginView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'), # <-- Добавлено
    path('me/', UserMeView.as_view(), name='user_me'),
]