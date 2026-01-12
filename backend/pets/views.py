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

from .models import Pet, Category, Attribute, Tag, PetAttribute, HealthEvent, PetImage, HealthEventAttachment, PetAccess
from .serializers import (
    PetSerializer, CategorySerializer, AttributeSerializer, 
    TagSerializer, HealthEventSerializer, PetImageSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
from .filters import PetFilter
from .services import build_pet_profile_prompt

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
    
    def _validate_file(self, file_obj):
        """Проверка типа и размера файла"""
        ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB

        if file_obj.content_type not in ALLOWED_TYPES:
            raise ValidationError(f"Недопустимый формат файла: {file_obj.name}. Разрешены: JPG, PNG, PDF.")
        
        if file_obj.size > MAX_SIZE:
            raise ValidationError(f"Файл {file_obj.name} слишком большой. Максимум 5 МБ.")

    def perform_create(self, serializer):
        files = self.request.FILES.getlist('attachments')
        for f in files:
            self._validate_file(f)

        user = self.request.user
        is_trusted_source = user.is_veterinarian and getattr(user, 'is_verified', False)
        
        event = serializer.save(
            created_by=user, 
            is_verified=is_trusted_source
        )
        
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

class AIConsultView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pet_id = request.data.get('pet_id')
        query = request.data.get('query')

        if not pet_id or not query:
            return Response({'error': 'pet_id and query are required'}, status=400)

        # Проверка доступа
        if not request.user.pets.filter(id=pet_id).exists():
             return Response({'error': 'Access denied'}, status=403)

        # Сборка контекста
        pet_profile_text = build_pet_profile_prompt(pet_id)
        if not pet_profile_text:
            return Response({'error': 'Pet not found'}, status=404)

        # Настройка Gemini
        if not settings.GEMINI_API_KEY:
             return Response({'error': 'Server config error: No AI Key'}, status=500)
             
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # 2. Инициализируем модель с настройкой JSON Mode
        # Это заставляет модель саму следить за скобками
        model = genai.GenerativeModel(
            'gemini-2.5-flash-lite', # Или твоя версия (gemini-2.5-flash-lite)
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
  "title": "Короткий, но емкий заголовок (например: 'Похоже на половую охоту')",
  "content": "Текст ответа. \n\n1. **Основная версия:** ... \n2. **Альтернатива (Болезнь):** ... \n3. **Что делать:** ..."
}}
"""

        try:
            response = model.generate_content(final_prompt)
            raw_text = response.text

            # 3. ХИРУРГИЧЕСКАЯ ОЧИСТКА (Regex)
            # Находим всё, что лежит между первой { и последней }
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            
            if match:
                json_str = match.group(0)
                ai_data = json.loads(json_str)
                return Response(ai_data)
            else:
                # Если regex не нашел JSON, пробуем распарсить как есть (на всякий случай)
                ai_data = json.loads(raw_text)
                return Response(ai_data)

        except json.JSONDecodeError:
            print(f"JSON Parse Error. Raw text was: {raw_text}") # Лог в терминал
            return Response({
                'urgency': 'medium',
                'title': 'Ошибка обработки',
                'content': f"Нейросеть ответила, но формат нарушен. Попробуйте еще раз.\n\n(Технические детали: {raw_text[:100]}...)"
            })
        except Exception as e:
            print(f"GenAI Error: {e}")
            return Response({'error': str(e)}, status=500)