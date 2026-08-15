from django.urls import path
from .views import DictionaryView, ProtectedMediaView, HealthView

urlpatterns = [
    path('dictionaries/', DictionaryView.as_view(), name='dictionaries'),
    path('protected-media/<path:path>', ProtectedMediaView.as_view(), name='protected-media'),
    path('health/', HealthView.as_view(), name='health'),
]
