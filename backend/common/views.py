from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
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
        categories = Category.objects.prefetch_related('available_attributes').all()
        
        for cat in categories:
            attrs = []
            for attr in cat.available_attributes.all():
                attrs.append({
                    'slug': attr.slug,
                    'name': attr.name,
                    'type': attr.attr_type, # text, number, select...
                    'unit': attr.unit,
                    # Если у атрибута есть опции (select), их надо распарсить (если они хранятся текстом)
                    # или добавить поле options в модель Attribute, если его нет.
                    # Пока предположим, что это просто текстовое поле.
                })
            
            categories_data.append({
                'id': cat.id,
                'slug': cat.slug,
                'name': cat.name,
                'icon': cat.icon if cat.icon else None, # Если есть поле icon
                'attributes': attrs
            })

        # 2. Собираем Теги
        tags_data = [
            {
                'id': tag.id,
                'slug': tag.slug,
                'name': tag.name,
                'color': tag.color
            } 
            for tag in Tag.objects.all()
        ]

        # 3. Собираем Типы Событий (Вакцинация, Осмотр...)
        event_types = [
            {
                'slug': et.slug,
                'name': et.name,
                'icon': et.icon
            }
            for et in EventType.objects.all()
        ]

        return Response({
            'categories': categories_data,
            'tags': tags_data,
            'event_types': event_types,
            'version': '1.0' # Для кеширования на клиенте
        })