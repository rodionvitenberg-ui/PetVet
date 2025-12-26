from rest_framework import viewsets, status, parsers, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Case, When, IntegerField, Count
from django.db import connection
# Импорты для токенов и подписей
from django.core import signing
from django.conf import settings

from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
import re

from .models import Pet, Category, Attribute, Tag, PetAttribute, HealthEvent, PetImage, HealthEventAttachment, PetAccess
from .serializers import (
    PetSerializer, CategorySerializer, AttributeSerializer, 
    TagSerializer, HealthEventSerializer, PetImageSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
from .filters import PetFilter

def normalize_search_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.lower().strip())

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by == request.user

class CustomSearchFilter(filters.SearchFilter):
    def filter_queryset(self, request, queryset, view):
        search_term = self.get_search_terms(request)
        if not search_term:
            return queryset
            
        search_query = normalize_search_text(search_term[0])
        if not search_query:
            return queryset
        
        vector = (
            SearchVector('name', weight='A') +
            SearchVector('tags__name', weight='A') +
            SearchVector('attributes__value', weight='B') +
            SearchVector('categories__name', weight='B') +
            SearchVector('description', weight='C')
        )
        
        query = SearchQuery(search_query)
        
        return queryset.annotate(
            rank=SearchRank(vector, query)
        ).filter(rank__gt=0).order_by('-rank', '-id').distinct()

class PetViewSet(viewsets.ModelViewSet):
    """
    API для управления питомцами.
    Поддерживает: CRUD, Ленту (feed), Доступ (sharing).
    """
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend, CustomSearchFilter)
    filterset_class = PetFilter
    
    def get_queryset(self):
        user = self.request.user
        # === [LOGIC UPDATE] ===
        # Показываем питомцев, где пользователь Владелец ИЛИ имеет Активный Доступ
        return Pet.objects.filter(
            Q(owner=user) | 
            Q(access_grants__user=user, access_grants__is_active=True)
        ).filter(is_active=True).distinct()\
            .select_related('owner', 'mother', 'father') \
            .prefetch_related(
                'attributes__attribute', 
                'tags', 
                'images',          
                'mother__images', 
                'father__images',
                'categories',
                'events__attachments'
            )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # === [NEW FEATURE] 1. Генерация QR-токена ===
    @action(detail=True, methods=['get'])
    def share_token(self, request, pk=None):
        """
        Генерирует временную ссылку/токен для передачи прав доступа.
        Только владелец может вызвать этот метод.
        """
        pet = self.get_object()
        
        if pet.owner != request.user:
            return Response({"error": "Только владелец может делиться доступом"}, status=403)
        
        # Подписываем ID питомца. Токен будет валиден, пока мы его проверяем (например, 1 час).
        # Формат данных: "pet_share:<pet_id>"
        signer = signing.TimestampSigner()
        token = signer.sign(f"pet_share:{pet.id}")
        
        # Можно вернуть полный URL для QR-кода, если есть схема deep-link
        # return Response({"token": token, "qr_link": f"petvet://share/{token}"})
        return Response({"token": token})

    # === [NEW FEATURE] 2. Активация доступа (сканирование QR) ===
    @action(detail=False, methods=['post'])
    def accept_access(self, request):
        """
        Ветеринар отправляет сюда токен из QR-кода, чтобы получить доступ.
        """
        token = request.data.get('token')
        if not token:
            return Response({"error": "Токен не предоставлен"}, status=400)
        
        signer = signing.TimestampSigner()
        try:
            # Проверяем подпись и срок жизни (например, 1 час = 3600 сек)
            original = signer.unsign(token, max_age=3600)
            prefix, pet_id_str = original.split(':')
            
            if prefix != 'pet_share':
                raise signing.BadSignature()
                
            pet_id = int(pet_id_str)
            pet = Pet.objects.get(id=pet_id)
            
        except signing.SignatureExpired:
            return Response({"error": "Срок действия QR-кода истек. Попросите новый."}, status=400)
        except (signing.BadSignature, ValueError):
            return Response({"error": "Некорректный QR-код"}, status=400)
        except Pet.DoesNotExist:
            return Response({"error": "Питомец не найден"}, status=404)

        # Защита от самого себя
        if pet.owner == request.user:
            return Response({"message": "Вы уже владелец этого питомца"}, status=200)

        # Выдаем доступ (или обновляем существующий)
        PetAccess.objects.update_or_create(
            pet=pet,
            user=request.user,
            defaults={
                'access_level': 'write', # По умолчанию даем полный доступ (можно менять)
                'is_active': True
            }
        )
        
        return Response({
            "status": "success", 
            "pet_id": pet.id, 
            "pet_name": pet.name,
            "message": "Доступ успешно получен"
        })

    # ... (Остальные методы: feed, upload_image остаются без изменений) ...
    @action(detail=False, methods=['GET'], permission_classes=[AllowAny])
    def feed(self, request):
        queryset = Pet.objects.filter(is_active=True, is_public=True)\
            .select_related('owner')\
            .prefetch_related(
                'attributes__attribute', 
                'tags', 
                'images', 
                'categories'
            ).order_by('-created_at') 
        
        filtered_queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(filtered_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['POST'], parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        pet = self.get_object()
        serializer = PetImageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(pet=pet)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class HealthEventViewSet(viewsets.ModelViewSet):
    serializer_class = HealthEventSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
    
    def get_queryset(self):
        # === [LOGIC UPDATE] ===
        # Ветеринар должен видеть события питомцев, к которым у него есть доступ
        user = self.request.user
        return HealthEvent.objects.filter(
            Q(pet__owner=user) | 
            Q(pet__access_grants__user=user, pet__access_grants__is_active=True)
        ).distinct()\
            .select_related('pet', 'created_by')\
            .prefetch_related('attachments')\
            .order_by('-date')

    def perform_create(self, serializer):
        user = self.request.user
        is_trusted_source = user.is_veterinarian and getattr(user, 'is_verified', False)
        
        event = serializer.save(
            created_by=user, 
            is_verified=is_trusted_source
        )
        
        files = self.request.FILES.getlist('attachments')
        for f in files:
            HealthEventAttachment.objects.create(event=event, file=f)
            
        if 'document' in self.request.FILES:
             HealthEventAttachment.objects.create(event=event, file=self.request.FILES['document'])

    def perform_update(self, serializer):
        event = serializer.save()
        files = self.request.FILES.getlist('attachments')
        for f in files:
            HealthEventAttachment.objects.create(event=event, file=f)

class HealthEventAttachmentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = HealthEventAttachment.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return HealthEventAttachment.objects.filter(event__created_by=self.request.user)

# ... (Остальные ViewSets: Category, Attribute, Tag остаются без изменений) ...
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.annotate(children_count=Count('children'))\
        .prefetch_related('children')\
        .order_by('sort_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('leafs'):
            return queryset.filter(children_count=0)
        return queryset

    def _get_ancestor_ids(self, category_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH RECURSIVE ancestors AS (
                    SELECT id, parent_id FROM pets_category WHERE id = %s
                    UNION ALL
                    SELECT c.id, c.parent_id FROM pets_category c
                    INNER JOIN ancestors a ON c.id = a.parent_id
                ) SELECT id FROM ancestors;
            """, [category_id])
            rows = cursor.fetchall()
        return [row[0] for row in rows]

    def _get_descendant_ids(self, category_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH RECURSIVE descendants AS (
                    SELECT id FROM pets_category WHERE id = %s
                    UNION ALL
                    SELECT c.id FROM pets_category c
                    INNER JOIN descendants d ON c.parent_id = d.id
                ) SELECT id FROM descendants;
            """, [category_id])
            rows = cursor.fetchall()
        return [row[0] for row in rows]

    @action(detail=True, methods=['get'])
    def tags(self, request, pk=None):
        ancestor_ids = self._get_ancestor_ids(pk)
        if not ancestor_ids:
            return Response({"error": "Category not found"}, status=404)

        tags = Tag.objects.filter(
            Q(category__id__in=ancestor_ids) | Q(category__isnull=True)
        ).distinct().order_by('sort_order', 'name')

        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def attributes(self, request, pk=None):
        ancestor_ids = self._get_ancestor_ids(pk)
        if not ancestor_ids:
            return Response({"error": "Category not found"}, status=404)

        attributes = Attribute.objects.filter(
            category__id__in=ancestor_ids
        ).distinct().order_by('sort_order')

        serializer = AttributeSerializer(attributes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def filters(self, request, pk=None):
        category_ids = self._get_descendant_ids(pk)
        if not category_ids:
             return Response({"error": "Category not found"}, status=404)

        pet_attributes = PetAttribute.objects.filter(
            pet__categories__id__in=category_ids
        ).select_related('attribute')

        filters_data = {}
        for pa in pet_attributes:
            attr = pa.attribute
            if attr.id not in filters_data:
                filters_data[attr.id] = {
                    "id": attr.id,
                    "name": attr.name,
                    "slug": attr.slug,
                    "unit": attr.unit,
                    "sort_order": attr.sort_order,
                    "values": set()
                }
            filters_data[attr.id]["values"].add(pa.value)

        response_data = list(filters_data.values())
        for item in response_data:
            item["values"] = sorted(list(item["values"]))
        
        response_data.sort(key=lambda x: x['sort_order'])
        return Response(response_data)

class AttributeViewSet(viewsets.ModelViewSet):
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [AllowAny]

class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]