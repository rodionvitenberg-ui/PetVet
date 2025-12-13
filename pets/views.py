from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Case, When, IntegerField
import re

from .models import Pet, Category, Attribute, Tag, PetAttribute, HealthEvent
from .serializers import (
    PetSerializer, CategorySerializer, AttributeSerializer, 
    TagSerializer, HealthEventSerializer
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
        # Стандартный запрос: показывает только питомцев ТЕКУЩЕГО пользователя
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

    # --- ВОТ ЭТОТ МЕТОД МЫ ДОБАВЛЯЕМ ---
    @action(detail=False, methods=['GET'])
    def feed(self, request):
        """
        Публичная лента: Показывает ВСЕХ зверей (чужих и своих), у кого is_public=True.
        Поддерживает фильтрацию и поиск.
        """
        # 1. Запрос: Ищем всех активных и публичных
        # order_by('-created_at') выведет сначала новых
        queryset = Pet.objects.filter(is_active=True, is_public=True)\
            .select_related('owner')\
            .prefetch_related(
                'attributes__attribute', 
                'tags', 
                'images', 
                'categories'
            ).order_by('-created_at') 
        
        # 2. Применяем фильтры (PetFilter + SearchFilter)
        # Это позволяет искать в ленте "только рыжих корги"
        filtered_queryset = self.filter_queryset(queryset)

        # 3. Пагинация (чтобы не вывалить 1000 котов сразу)
        page = self.paginate_queryset(filtered_queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Если пагинация отключена
        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(serializer.data)

class HealthEventViewSet(viewsets.ModelViewSet):
    """
    API для управления медицинской картой (Вакцинация, Вес, Визиты)
    """
    serializer_class = HealthEventSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Показываем события только моих питомцев
        return HealthEvent.objects.filter(pet__owner=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        user = self.request.user
        is_trusted_source = user.is_veterinarian and user.is_verified
        serializer.save(
            created_by=user, 
            is_verified=is_trusted_source
        )

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().prefetch_related('children')
    serializer_class = CategorySerializer

    @action(detail=True, methods=['get'])
    def tags(self, request, pk=None):
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
        
        # Сортируем теги согласно sort_order
        tags = Tag.objects.filter(
            pet__categories__id__in=category_ids
        ).distinct().order_by('sort_order', 'name')

        serializer = TagSerializer(tags, many=True)
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
        
        # Сортируем фильтры по важности
        response_data.sort(key=lambda x: x['sort_order'])

        return Response(response_data)

class AttributeViewSet(viewsets.ModelViewSet):
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [IsAuthenticated]