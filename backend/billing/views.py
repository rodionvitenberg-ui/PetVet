from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import CatalogItem, Invoice, EventTemplate, Subscription
from .payments import ProviderError, create_checkout, handle_webhook
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


# ──────────────────────────────────────────────
# Subscription API (Cryptomus)
# ──────────────────────────────────────────────


class SubscriptionCheckoutView(APIView):
    """
    POST /api/billing/subscription/checkout/
    Создаёт крипто-подписку $5/мес через Cryptomus.
    Возвращает { "checkout_url": "https://..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            checkout_url = create_checkout(request.user)
        except ProviderError as exc:
            return Response({"error": str(exc)}, status=400)

        return Response({"checkout_url": checkout_url})


class SubscriptionStatusView(APIView):
    """
    GET /api/billing/subscription/status/
    Текущий статус подписки пользователя (источник правды — webhook).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sub = Subscription.objects.filter(user=request.user).first()
        if not sub:
            return Response({"status": "none", "is_active": False})

        if sub.current_period_end and sub.current_period_end < timezone.now() and sub.status == 'active':
            sub.status = 'canceled'
            sub.save(update_fields=['status', 'updated_at'])

        return Response({
            "status": sub.status,
            "is_active": sub.status == 'active',
            "current_period_end": sub.current_period_end,
        })


@csrf_exempt
def cryptomus_webhook(request):
    """
    POST /api/billing/subscription/webhook/cryptomus/
    Обрабатывает события подписки Cryptomus.
    """
    try:
        result = handle_webhook(request.body, request.META.get('HTTP_SIGN', ''))
    except ProviderError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse({"status": result})
