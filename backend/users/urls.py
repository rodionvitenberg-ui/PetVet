from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, 
    ActivateAccountView,
    UserMeView, 
    GoogleLoginView, 
    UserContactViewSet, 
    VerificationViewSet
)

router = DefaultRouter()
router.register(r'contacts', UserContactViewSet, basename='user-contacts')
router.register(r'verification', VerificationViewSet, basename='verification')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('activate/', ActivateAccountView.as_view(), name='auth_activate'),
    path('google/', GoogleLoginView.as_view(), name='auth_google'),
    path('me/', UserMeView.as_view(), name='user_me'),
    
    path('', include(router.urls)),
]