from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CatalogItemViewSet,
    InvoiceViewSet,
    EventTemplateViewSet,
    SubscriptionCheckoutView,
    SubscriptionStatusView,
    cryptomus_webhook,
)

router = DefaultRouter()
router.register(r'catalog', CatalogItemViewSet, basename='catalog')
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'templates', EventTemplateViewSet, basename='templates') # <--- Макросы

urlpatterns = [
    path('', include(router.urls)),
    path('subscription/checkout/', SubscriptionCheckoutView.as_view(), name='subscription-checkout'),
    path('subscription/status/', SubscriptionStatusView.as_view(), name='subscription-status'),
    path('subscription/webhook/cryptomus/', cryptomus_webhook, name='subscription-webhook-cryptomus'),
]
