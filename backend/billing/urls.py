from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CatalogItemViewSet, InvoiceViewSet, EventTemplateViewSet

router = DefaultRouter()
router.register(r'catalog', CatalogItemViewSet, basename='catalog')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'templates', EventTemplateViewSet, basename='templates') # <--- Макросы

urlpatterns = [
    path('', include(router.urls)),
]