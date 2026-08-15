from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import CatalogItem, Invoice, EventTemplate
from .serializers import CatalogItemSerializer, InvoiceSerializer, EventTemplateSerializer


class IsInvoiceEditor(permissions.BasePermission):
    """
    Доступ к счету имеют:
    - создатель счёта (vet/clinic);
    - клиент, привязанный к счёту (client=user или pet.owner=user);
    - пользователи с активным write-доступом к питомцу счёта.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Создатель
        if obj.created_by_id == user.id:
            return True

        # Клиент (прямая привязка)
        if obj.client_id == user.id:
            return True

        # Питомец: владелец или write-доступ
        if obj.pet_id:
            if obj.pet.owner_id == user.id:
                return True
            if obj.pet.access_grants.filter(
                user=user, is_active=True, access_level='write'
            ).exists():
                return True

        return False

    def has_permission(self, request, view):
        # Авторизация не требуется для GET-списка: изоляция через get_queryset.
        # Для записи (POST/PATCH/DELETE) нужен аутентифицированный пользователь.
        return bool(request.user and request.user.is_authenticated)


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
    permission_classes = [permissions.IsAuthenticated, IsInvoiceEditor]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'client', 'pet', 'event']
    ordering_fields = ['created_at', 'total_amount']

    def get_queryset(self):
        """
        Изоляция счетов: пользователь видит только счета, где он
        создатель, клиент, владелец питомца или имеет write-доступ к питомцу.
        """
        user = self.request.user
        return Invoice.objects.filter(
            Q(created_by=user) |
            Q(client=user) |
            Q(pet__owner=user) |
            Q(pet__access_grants__user=user, pet__access_grants__is_active=True, pet__access_grants__access_level='write')
        ).distinct().select_related('client', 'pet', 'created_by').prefetch_related('items')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)