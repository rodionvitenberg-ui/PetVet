import google.generativeai as genai
from rest_framework import viewsets, status, parsers, permissions, mixins
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from .services import build_pet_profile_prompt
from django.db.models import Q, Case, When, IntegerField, Count
from django.db import connection
from django.core import signing
from django.conf import settings


from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
import re
import json

from .models import Pet, Category, Attribute, Tag, PetAttribute, EventType, PetImage, PetEvent, PetEventAttachment, PetAccess
from .serializers import (
    PetSerializer, CategorySerializer, AttributeSerializer, 
    TagSerializer, EventTypeSerializer, PetEventSerializer, PetEventAttachmentSerializer, PetImageSerializer, PedigreeSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
from .filters import PetFilter
from .services import build_pet_profile_prompt

def normalize_search_text(text):
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.lower().strip())

class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Чтение разрешено всем (безопасные методы: GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Изменение разрешено, только если ты автор этого объекта
        return obj.created_by == request.user

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
            Q(access_grants__user=user, access_grants__is_active=True) |
            Q(created_by=user, owner__isnull=True) # <--- Теневые карты врача
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
        user = self.request.user
        is_shadow_create = False
        
        if user.is_veterinarian:
            temp_phone = serializer.validated_data.get('temp_owner_phone')
            if temp_phone:
                is_shadow_create = True
        
        if is_shadow_create:
            serializer.save(
                owner=None,   
                created_by=user 
            )
        else:
            serializer.save(owner=user)

    # === [NEW FEATURE] 1. Генерация QR-токена ===
    @action(detail=True, methods=['get'])
    def share_token(self, request, pk=None):
        """
        Генерирует временную ссылку/токен для передачи прав доступа.
        Только владелец может вызвать этот метод.
        """
        pet = self.get_object()
        
        if pet.owner != request.user and pet.created_by != request.user:
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
    
    @action(detail=True, methods=['get'])
    def pedigree(self, request, pk=None):
        """
        Возвращает дерево предков (рекурсивно) для визуализации.
        URL: /api/pets/{id}/pedigree/
        """
        pet = self.get_object()
        serializer = PedigreeSerializer(pet, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['POST'], parser_classes=[parsers.MultiPartParser])
    def upload_image(self, request, pk=None):
        pet = self.get_object()
        serializer = PetImageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(pet=pet)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 1. ViewSet для типов событий (Справочник)
class EventTypeViewSet(viewsets.ModelViewSet):
    serializer_class = EventTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly] # Используем наш пермишен

    def get_queryset(self):
        user = self.request.user
        # Показываем системные + пользовательские
        return EventType.objects.filter(
            Q(created_by__isnull=True) | Q(created_by=user)
        ).order_by('category', 'name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# 2. Обновленный ViewSet для событий
class PetEventViewSet(viewsets.ModelViewSet):
    serializer_class = PetEventSerializer
    permission_classes = [permissions.IsAuthenticated] # Добавьте IsOwnerOrReadOnly при необходимости
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['pet', 'event_type__category', 'status', 'date']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        
        # 1. Базовая фильтрация по датам (для Календаря)
        queryset = PetEvent.objects.all()
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])

        return queryset.filter(
            Q(pet__owner=user) | 
            Q(pet__access_grants__user=user) |
            Q(created_by=user)
        ).select_related('event_type', 'pet').distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PetEventAttachmentViewSet(viewsets.ModelViewSet):
    """
    CRUD для загрузки файлов к событиям.
    """
    serializer_class = PetEventAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Показываем только файлы моих питомцев
        return PetEventAttachment.objects.filter(
            event__pet__owner=self.request.user
        )

    def perform_create(self, serializer):
        # Проверка прав: нельзя прикрепить файл к чужому событию
        event = serializer.validated_data.get('event')
        if event.pet.owner != self.request.user:
            raise PermissionDenied("Вы не можете добавлять файлы к чужим событиям.")
        serializer.save()

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

class AttributeViewSet(viewsets.ModelViewSet): # <--- Стало ModelViewSet
    serializer_class = AttributeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        return Attribute.objects.filter(
            Q(created_by__isnull=True) | Q(created_by=user)
        ).order_by('-is_universal', 'sort_order', 'name')

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            is_universal=False
        )

class TagViewSet(viewsets.ModelViewSet): # <--- Стало ModelViewSet (теперь можно писать)
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly] # <--- Подключили защиту

    def get_queryset(self):
        user = self.request.user
        # Показываем: Системные + Мои
        return Tag.objects.filter(
            Q(created_by__isnull=True) | Q(created_by=user)
        ).order_by('-is_universal', 'sort_order', 'name')

    # При создании автоматически привязываем к юзеру
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user, 
            is_universal=False # Пользовательские теги по умолчанию не универсальны (хотя можно разрешить)
        )

class AIConsultView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pet_id = request.data.get('pet_id')
        query = request.data.get('query')

        if not pet_id or not query:
            return Response({'error': 'pet_id and query are required'}, status=400)

        # === [FIX] ИСПРАВЛЕННАЯ ПРОВЕРКА ДОСТУПА ===
        # Проверяем права так же, как в PetViewSet:
        # 1. Владелец
        # 2. Есть активный доступ (shared access)
        # 3. Создатель "теневой" карты (без владельца)
        has_access = Pet.objects.filter(id=pet_id).filter(
            Q(owner=request.user) | 
            Q(access_grants__user=request.user, access_grants__is_active=True) |
            Q(created_by=request.user, owner__isnull=True)
        ).exists()

        if not has_access:
             return Response({'error': 'Access denied'}, status=403)

        # Сборка контекста
        pet_profile_text = build_pet_profile_prompt(pet_id)
        if not pet_profile_text:
            return Response({'error': 'Pet not found'}, status=404)

        # Настройка Gemini
        if not settings.GEMINI_API_KEY:
             return Response({'error': 'Server config error: No AI Key'}, status=500)
             
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Инициализируем модель с настройкой JSON Mode
        model = genai.GenerativeModel(
            'gemini-2.0-flash', # Рекомендую 2.0-flash, она быстрее и стабильнее с JSON
            generation_config={"response_mime_type": "application/json"} 
        )

        final_prompt = f"""
Ты — опытный ветеринарный ментор. Твоя задача — не просто отправить в клинику, а помочь владельцу понять ПРИЧИНУ поведения.

=== ПАЦИЕНТ ===
{pet_profile_text}

=== ЖАЛОБА ВЛАДЕЛЬЦА ===
"{query}"

=== ИНСТРУКЦИЯ ДЛЯ AI ===
1. Сначала проанализируй возраст, пол и СТАТУС КАСТРАЦИИ. 
   - Если животное молодое и не кастрировано -> С высокой вероятностью рассмотри половое поведение (течка, гон), особенно если жалобы на "беспокойство", "крики", "попытки убежать".
2. Если симптомы похожи на половую охоту, поставь urgency: "low" или "medium" (это не смертельно) и успокой владельца.
3. Рассмотри медицинские причины (боль, инфекция), но сравни их вероятность с поведенческими.
4. Избегай канцелярских отписок ("Обратитесь к врачу"). Дай конкретные гипотезы.

=== ФОРМАТ ОТВЕТА (JSON) ===
Ответь ТОЛЬКО валидным JSON.
{{
  "urgency": "low" | "medium" | "high", 
  "title": "Короткий заголовок",
  "content": "Текст ответа. Использйте переносы строки \\n для форматирования."
}}
"""

        try:
            response = model.generate_content(final_prompt)
            raw_text = response.text

            # Regex поиск JSON на случай, если модель добавит markdown ```json ... ```
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            
            if match:
                json_str = match.group(0)
                ai_data = json.loads(json_str)
                return Response(ai_data)
            else:
                ai_data = json.loads(raw_text)
                return Response(ai_data)

        except json.JSONDecodeError:
            print(f"JSON Parse Error. Raw text was: {raw_text}") 
            return Response({
                'urgency': 'medium',
                'title': 'Ошибка обработки',
                'content': "Нейросеть ответила, но формат нарушен. Попробуйте еще раз."
            })
        except Exception as e:
            print(f"GenAI Error: {e}")
            return Response({'error': str(e)}, status=500)
        
class PetImageViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    Специальный ViewSet для удаления фотографий.
    Поддерживает только DELETE /api/pet_images/{id}/
    """
    serializer_class = PetImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Удалять фото могут: Владелец, Врач с доступом, Создатель теневой карты
        return PetImage.objects.filter(
            Q(pet__owner=user) | 
            Q(pet__access_grants__user=user, pet__access_grants__is_active=True) |
            Q(pet__created_by=user, pet__owner__isnull=True)
        )