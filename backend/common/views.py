import os
import mimetypes

from django.conf import settings
from django.http import FileResponse, Http404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from pets.models import Category, Tag, Attribute, EventType


class DictionaryView(APIView):
    """
    Единая точка входа для конфигурации клиента.
    Отдает все справочники, чтобы приложение могло работать оффлайн.
    """
    permission_classes = [AllowAny] # Разрешаем доступ гостям

    def get(self, request):
        # 1. Собираем Категории и их Атрибуты
        categories_data = []
        categories = Category.objects.prefetch_related('attributes').all()
        
        for cat in categories:
            attrs = []
            for attr in cat.attributes.all():
                attrs.append({
                    'slug': attr.slug,
                    'name': attr.name,
                    'type': attr.attr_type, # text, number, select...
                    'unit': attr.unit,
                    'options': attr.options if attr.attr_type == 'select' else [],
                })
            
            categories_data.append({
                'id': cat.id,
                'slug': cat.slug,
                'name': cat.name,
                'icon': request.build_absolute_uri(cat.icon.url) if cat.icon else None,
                'attributes': attrs
            })

        # 2. Собираем Теги
        tags_data = [
            {
                'id': tag.id,
                'slug': tag.slug,
                'name': tag.name,
            } 
            for tag in Tag.objects.all()
        ]

        # 3. Собираем Типы Событий (Вакцинация, Осмотр...)
        event_types = [
            {
                'slug': et.slug,
                'name': et.name,
                'icon': request.build_absolute_uri(et.icon.url) if et.icon else None
            }
            for et in EventType.objects.all()
        ]

        return Response({
            'categories': categories_data,
            'tags': tags_data,
            'event_types': event_types,
            'version': '1.0' # Для кеширования на клиенте
        })


class HealthView(APIView):
    """GET /api/health/ — проверка БД и Redis для мониторинга."""
    permission_classes = [AllowAny]
    authentication_classes = []  # healthcheck не требует auth

    def get(self, request):
        from django.db import connection
        import redis

        status_code = 200
        result = {"status": "ok", "checks": {}}

        # DB
        try:
            connection.ensure_connection()
            result["checks"]["db"] = "ok"
        except Exception:
            result["checks"]["db"] = "error"
            result["status"] = "error"
            status_code = 500

        # Redis (прямое подключение через redis-py)
        try:
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                socket_connect_timeout=2,
            )
            r.ping()
            result["checks"]["redis"] = "ok"
        except Exception:
            result["checks"]["redis"] = "error"
            result["status"] = "error"
            status_code = 500

        return Response(result, status=status_code)


class ProtectedMediaView(APIView):
    """
    Безопасная раздача чувствительных медиафайлов (vet_docs, chat_attachments,
    event_docs, health_docs). Требует аутентификации и проверяет права доступа.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, path):
        user = request.user

        # Валидация: файл должен находиться внутри MEDIA_ROOT
        media_root = os.path.realpath(settings.MEDIA_ROOT)
        full_path = os.path.realpath(os.path.join(media_root, path))

        if not full_path.startswith(media_root + os.sep):
            raise Http404("File not found")

        if not os.path.isfile(full_path):
            raise Http404("File not found")

        # --- Проверка прав по префиксу ---
        if path.startswith('vet_docs/'):
            self._check_vet_docs_access(user, full_path, path)
        elif path.startswith('chat_attachments/'):
            self._check_chat_attachment_access(user, full_path, path)
        elif path.startswith('event_docs/') or path.startswith('health_docs/'):
            self._check_pet_related_access(user, path)
        else:
            # Неизвестный префикс — не отдаём через защищённый эндпоинт
            raise Http404("File not found")

        content_type, _ = mimetypes.guess_type(full_path)
        if content_type is None:
            content_type = 'application/octet-stream'

        return FileResponse(
            open(full_path, 'rb'),
            content_type=content_type,
            filename=os.path.basename(full_path),
        )

    def _check_vet_docs_access(self, user, full_path, path):
        """vet_docs больше не создаются (верификация заменена подпиской).
        Оставляем доступ только staff для чтения исторических файлов."""
        if user.is_staff:
            return

        raise Http404("File not found")

    def _check_chat_attachment_access(self, user, full_path, path):
        """chat_attachments может читать участник чата (owner или vet)."""
        from chat.models import ChatMessage

        filename = os.path.basename(full_path)
        has_access = ChatMessage.objects.filter(
            attachment__endswith=filename,
        ).filter(
            room__owner=user,
        ).exists() or ChatMessage.objects.filter(
            attachment__endswith=filename,
        ).filter(
            room__vet=user,
        ).exists()

        if not has_access:
            raise Http404("File not found")

    def _check_pet_related_access(self, user, path):
        """event_docs/health_docs — владелец питомца или write-доступ."""
        filename = os.path.basename(path)

        # Для PetEventAttachment: ищем события с вложением, у которых pet доступен
        from pets.models import PetEventAttachment, Pet, PetImage
        has_event_access = PetEventAttachment.objects.filter(
            file__endswith=filename,
        ).filter(
            event__pet__owner=user,
        ).exists() or PetEventAttachment.objects.filter(
            file__endswith=filename,
        ).filter(
            event__pet__access_grants__user=user,
            event__pet__access_grants__is_active=True,
            event__pet__access_grants__access_level='write',
        ).exists()

        if has_event_access:
            return

        # health_docs могут быть у питомца (PetImage или документация событий)
        pet_has_access = PetImage.objects.filter(
            image__endswith=filename,
            pet__in=Pet.objects.filter(
                owner=user,
            ),
        ).exists() or PetImage.objects.filter(
            image__endswith=filename,
            pet__in=Pet.objects.filter(
                access_grants__user=user,
                access_grants__is_active=True,
                access_grants__access_level='write',
            ),
        ).exists()

        if not pet_has_access and not has_event_access:
            raise Http404("File not found")