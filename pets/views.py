from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Case, When, IntegerField, Count
from django.db import connection
# Импорт для полнотекстового поиска Postgres
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
import re

from .models import Pet, Category, Attribute, Tag, PetAttribute, HealthEvent, PetImage
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

class CustomSearchFilter(filters.SearchFilter):
    def filter_queryset(self, request, queryset, view):
        search_term = self.get_search_terms(request)
        if not search_term:
            return queryset
            
        search_query = normalize_search_text(search_term[0])
        if not search_query:
            return queryset
        
        # === [OPTIMIZATION FIX: Full Text Search] ===
        # Вместо медленного Full Table Scan (icontains) используем индексы Postgres.
        # Веса (A, B, C) определяют важность совпадения.
        vector = (
            SearchVector('name', weight='A') +
            SearchVector('tags__name', weight='A') +
            SearchVector('attributes__value', weight='B') +
            SearchVector('categories__name', weight='B') +
            SearchVector('description', weight='C')
        )
        
        query = SearchQuery(search_query)
        
        # annotate добавляет поле rank (релевантность), по которому мы сортируем.
        # distinct() обязателен, чтобы убрать дубли при совпадении в разных связанных таблицах.
        return queryset.annotate(
            rank=SearchRank(vector, query)
        ).filter(rank__gt=0).order_by('-rank', '-id').distinct()

class PetViewSet(viewsets.ModelViewSet):
    """
    API для управления питомцами.
    """
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend, CustomSearchFilter)
    filterset_class = PetFilter
    
    def get_queryset(self):
        # === [OPTIMIZATION FIX: N+1 Parents] ===
        # Загружаем родителей и их картинки заранее для сериализатора
        return Pet.objects.filter(owner=self.request.user, is_active=True)\
            .select_related('owner', 'mother', 'father') \
            .prefetch_related(
                'attributes__attribute', 
                'tags', 
                'images',          # Картинки самого питомца
                'mother__images',  # Картинки мамы (кэш для сериализатора)
                'father__images',  # Картинки папы (кэш для сериализатора)
                'categories',
                'events' 
            )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Оптимизация для событий: подгружаем связанные поля
        return HealthEvent.objects.filter(pet__owner=self.request.user)\
            .select_related('pet', 'created_by')\
            .order_by('-date')

    def perform_create(self, serializer):
        user = self.request.user
        is_trusted_source = user.is_veterinarian and user.is_verified
        serializer.save(
            created_by=user, 
            is_verified=is_trusted_source
        )

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

    # === [OPTIMIZATION FIX: CTE Helpers] ===
    # Вспомогательные методы для рекурсивных запросов через SQL

    def _get_ancestor_ids(self, category_id):
        """Получает ID категории и всех родителей вверх по дереву одним запросом"""
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
        """Получает ID категории и всех детей вниз по дереву одним запросом"""
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

    # === Endpoints ===

    @action(detail=True, methods=['get'])
    def tags(self, request, pk=None):
        """
        Возвращает теги категории (и ее родителей) + глобальные.
        Использует CTE для избавления от N+1.
        """
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
        """
        Возвращает атрибуты категории (и родителей).
        Использует CTE для избавления от N+1.
        """
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
        """
        Возвращает доступные фильтры для категории на основе потомков.
        Использует CTE для избавления от N+1 (Python-рекурсии).
        """
        category_ids = self._get_descendant_ids(pk)
        
        if not category_ids:
             return Response({"error": "Category not found"}, status=404)

        # Одним запросом выбираем атрибуты для всех подкатегорий
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