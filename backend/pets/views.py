from rest_framework import viewsets, status, parsers, permissions, mixins
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, PermissionDenied
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
from .access import pet_access_q, user_can_access_pet

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
            Q(created_by=user, owner__isnull=True) | # <--- Теневые карты врача
            Q(clinic__memberships__user=user)        # <--- Все пациенты клиники
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
            # Find user's clinic for auto-assignment
            from vetclinics.models import ClinicMember
            clinic_member = ClinicMember.objects.filter(
                user=user
            ).select_related('clinic').first()
            serializer.save(
                owner=None,   
                created_by=user,
                clinic=clinic_member.clinic if clinic_member else None,
            )
        else:
            serializer.save(owner=user)

    # === [NEW FEATURE] 1. Генерация QR-токена ===
    @action(detail=True, methods=['get'])
    def share_token(self, request, pk=None):
        """
        Генерирует временную ссылку/токен для передачи прав доступа.
        Только владелец может вызвать этот метод.
        Уровень доступа: ?access_level=read (default) | write
        """
        pet = self.get_object()
        
        if pet.owner != request.user and pet.created_by != request.user:
            return Response({"error": "Only the owner can share access"}, status=403)
        
        # [P0-7] Уровень доступа по умолчанию — read.
        # Если владелец явно попросил ?access_level=write — выдаём write.
        level = request.query_params.get('access_level', 'read')
        if level not in ('read', 'write'):
            return Response({"error": "access_level must be 'read' or 'write'"}, status=400)
        
        # Подписываем ID питомца. Токен будет валиден, пока мы его проверяем (например, 1 час).
        # Формат данных: "pet_share:<pet_id>:<level>"
        signer = signing.TimestampSigner()
        token = signer.sign(f"pet_share:{pet.id}:{level}")
        
        # Можно вернуть полный URL для QR-кода, если есть схема deep-link
        # return Response({"token": token, "qr_link": f"petvet://share/{token}"})
        return Response({"token": token, "access_level": level})

    # === [NEW FEATURE] 2. Активация доступа (сканирование QR) ===
    @action(detail=False, methods=['post'])
    def accept_access(self, request):
        """
        Ветеринар отправляет сюда токен из QR-кода, чтобы получить доступ.
        """
        token = request.data.get('token')
        if not token:
            return Response({"error": "No token provided"}, status=400)
        
        signer = signing.TimestampSigner()
        try:
            # Проверяем подпись и срок жизни (например, 1 час = 3600 сек)
            original = signer.unsign(token, max_age=3600)
            parts = original.split(':')
            
            if len(parts) == 2:
                # Обратная совместимость со старыми токенами: pet_share:<pet_id> → read
                prefix, pet_id_str = parts
                level = 'read'
            elif len(parts) == 3:
                # Новый формат: pet_share:<pet_id>:<level>
                prefix, pet_id_str, level = parts
                if level not in ('read', 'write'):
                    raise signing.BadSignature()
            else:
                raise signing.BadSignature()
            
            if prefix != 'pet_share':
                raise signing.BadSignature()
                
            pet_id = int(pet_id_str)
            pet = Pet.objects.get(id=pet_id)
            
        except signing.SignatureExpired:
            return Response({"error": "QR code has expired. Please request a new one."}, status=400)
        except (signing.BadSignature, ValueError):
            return Response({"error": "Invalid QR code"}, status=400)
        except Pet.DoesNotExist:
            return Response({"error": "Pet not found"}, status=404)

        # Защита от самого себя
        if pet.owner == request.user:
            return Response({"message": "You are already the owner of this pet"}, status=200)

        # [P0-7] Выдаём доступ с уровнем из токена (по умолчанию read),
        # а не форсируем write как раньше.
        PetAccess.objects.update_or_create(
            pet=pet,
            user=request.user,
            defaults={
                'access_level': level,
                'is_active': True
            }
        )
        
        return Response({
            "status": "success", 
            "pet_id": pet.id, 
            "pet_name": pet.name,
            "access_level": level,
            "message": "Access granted successfully"
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

        # [I-6] Единый access helper: владелец/теневой создатель/активный доступ.
        # pet_access_q применим к Pet, поэтому фильтруем события по питомцам
        # через подзапрос (поля owner/created_by/access_grants живут на Pet).
        accessible_pets = Pet.objects.filter(pet_access_q(user))
        return queryset.filter(
            Q(pet__in=accessible_pets) | Q(created_by=user)
        ).select_related('event_type', 'pet').distinct()

    def perform_create(self, serializer):
        event = serializer.save(created_by=self.request.user)

        # Auto-create Reminder for medical/recurring events (next_date set)
        if event.next_date and event.status in ('planned',):
            from notifications.models import Reminder

            category_map = {
                'medical': 'checkup',
                'care': 'grooming',
                'reproduction': 'reproduction',
            }
            reminder_type = category_map.get(event.event_type.category, 'other')

            notify_user = event.pet.owner
            if not notify_user and event.pet.created_by:
                notify_user = event.pet.created_by

            if notify_user:
                Reminder.objects.create(
                    user=notify_user,
                    pet=event.pet,
                    event_type=reminder_type,
                    title=event.title,
                    due_date=event.next_date.date(),
                    is_recurring=True,
                    interval_days=None,
                    created_by_event=event,
                )

    # [P-1] Эндпоинт, на который ссылается notifications.tasks.process_repeating_events
    # ("/api/events/{id}/duplicate/"). Создаёт повтор события: статус 'planned',
    # новая дата = next_date (или date + 30 дней), привязка к тому же питомцу.
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        POST /api/events/{id}/duplicate/
        Создаёт запланированную копию события. Если у оригинала есть next_date,
        копия берёт его как дату; иначе date + 30 дней.
        """
        original = self.get_object()
        user = request.user

        # Права: только владелец питомца или создатель события
        if original.pet and not user_can_access_pet(user, original.pet, write=True):
            return Response(
                {"error": "You do not have write access to this pet's events."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Новая дата
        from datetime import timedelta as _td
        if original.next_date:
            new_date = original.next_date
        else:
            new_date = original.date + _td(days=30)

        new_event = PetEvent.objects.create(
            pet=original.pet,
            event_type=original.event_type,
            title=original.title,
            description=original.description,
            date=new_date,
            data=original.data,
            status='planned',
            created_by=user,
        )

        serializer = self.get_serializer(new_event, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class PetEventAttachmentViewSet(viewsets.ModelViewSet):
    """
    CRUD для загрузки файлов к событиям.
    """
    serializer_class = PetEventAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Показываем только файлы питомцев, к которым юзер имеет доступ
        user = self.request.user
        return PetEventAttachment.objects.filter(
            Q(event__pet__owner=user) |
            Q(event__pet__access_grants__user=user, event__pet__access_grants__is_active=True) |
            Q(event__pet__created_by=user, event__pet__owner__isnull=True)
        ).distinct()

    def perform_create(self, serializer):
        # Проверка прав: нельзя прикрепить файл к чужому событию
        event = serializer.validated_data.get('event')
        if not user_can_access_pet(self.request.user, event.pet, write=True):
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