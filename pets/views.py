from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Case, When, IntegerField, Count
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
        
        q_objects = (
            Q(name__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(attributes__value__icontains=search_query) |
            Q(tags__name__icontains=search_query) |
            Q(categories__name__icontains=search_query)
        )
        
        filtered_queryset = queryset.filter(q_objects).distinct()
        
        return filtered_queryset.annotate(
            search_priority=Case(
                When(name__icontains=search_query, then=1),
                When(tags__name__icontains=search_query, then=2), 
                When(attributes__value__icontains=search_query, then=3),
                default=4,
                output_field=IntegerField(),
            )
        ).order_by('search_priority', '-id')

class PetViewSet(viewsets.ModelViewSet):
    """
    API для управления питомцами.
    """
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend, CustomSearchFilter)
    filterset_class = PetFilter
    
    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user, is_active=True)\
            .prefetch_related(
                'attributes__attribute', 
                'tags', 
                'images', 
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
        return HealthEvent.objects.filter(pet__owner=self.request.user).order_by('-date')

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

    # === [FIXED] ТЕГИ ===
    @action(detail=True, methods=['get'])
    def tags(self, request, pk=None):
        """
        Возвращает теги:
        1. Привязанные к этой категории (или ее родителям).
        2. Глобальные (не привязанные ни к чему).
        """
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        # Используем словарь для уникальности по ID (на случай дублей)
        tags_map = {}

        # 1. Теги от категории и родителей
        current = category
        while current:
            for tag in current.tags.all():
                tags_map[tag.id] = tag
            current = current.parent
        
        # 2. Глобальные теги (у которых нет связей с категориями)
        # В filter используем имя модели в нижнем регистре: category
        global_tags = Tag.objects.filter(category__isnull=True)
        for tag in global_tags:
            tags_map[tag.id] = tag
        
        # Превращаем обратно в список и сортируем
        tags_list = list(tags_map.values())
        
        # Сортировка: сначала по sort_order, потом по имени
        tags_list.sort(key=lambda x: (getattr(x, 'sort_order', 0), x.name))

        serializer = TagSerializer(tags_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def attributes(self, request, pk=None):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        attrs_map = {}
        current = category
        while current:
            for attr in current.attributes.all():
                attrs_map[attr.id] = attr
            current = current.parent
        
        sorted_attributes = sorted(list(attrs_map.values()), key=lambda x: getattr(x, 'sort_order', 0))

        serializer = AttributeSerializer(sorted_attributes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def filters(self, request, pk=None):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({"error": "Category not found"}, status=404)

        def get_all_child_ids(category_obj):
            children = category_obj.children.all()
            ids = [category_obj.id]
            for child in children:
                ids.extend(get_all_child_ids(child))
            return ids

        category_ids = get_all_child_ids(category)
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