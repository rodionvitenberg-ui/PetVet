from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import CatalogItem, Invoice, EventTemplate
from .serializers import CatalogItemSerializer, InvoiceSerializer, EventTemplateSerializer

class CatalogItemViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'code'] 
    filterset_fields = ['item_type']

    def get_queryset(self):
        user = self.request.user
        return CatalogItem.objects.filter(
            Q(created_by=user) | Q(is_global=True)
        ).filter(is_active=True).order_by('name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_global=False)

class EventTemplateViewSet(viewsets.ModelViewSet):
    """
    API для макросов (шаблонов осмотра + услуг).
    """
    serializer_class = EventTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return EventTemplate.objects.filter(
            Q(created_by=user) | Q(is_global=True)
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'client', 'pet', 'event']
    ordering_fields = ['created_at', 'total_amount']

    def get_queryset(self):
        return Invoice.objects.all().select_related('client', 'pet').prefetch_related('items')