import django_filters
from django.db.models import Q # <--- ОБЯЗАТЕЛЬНЫЙ ИМПОРТ
from .models import Pet

class PetFilter(django_filters.FilterSet):
    """Фильтр для питомцев с поддержкой EAV-атрибутов"""
    
    categories__slug = django_filters.CharFilter(method='filter_by_categories')
    tags__slug = django_filters.CharFilter(method='filter_by_tags')
    
    # Фильтр для поиска по названию/кличке (добавил label для ясности в API)
    name = django_filters.CharFilter(lookup_expr='icontains', label="Поиск по кличке")

    def filter_by_categories(self, queryset, name, value):
        """Фильтрация по множественным видам/категориям"""
        category_slugs = self.request.GET.getlist('categories__slug')
        if category_slugs:
            return queryset.filter(categories__slug__in=category_slugs).distinct()
        return queryset

    def filter_by_tags(self, queryset, name, value):
        """Фильтрация по множественным меткам"""
        tag_slugs = self.request.GET.getlist('tags__slug')
        if tag_slugs:
            return queryset.filter(tags__slug__in=tag_slugs).distinct()
        return queryset

    def filter_queryset(self, queryset):
        """Основной метод фильтрации с поддержкой JSON-атрибутов"""
        queryset = super().filter_queryset(queryset)
        
        # Обработка атрибутов из параметров запроса: attributes[breed]=corgi,husky
        for key, values in self.request.GET.items():
            if key.startswith('attributes[') and key.endswith(']'):
                # Вытаскиваем слаг атрибута, например 'breed'
                attr_slug = key[key.find('[')+1:key.find(']')]
                
                if values:
                    # Разбиваем строку "corgi,husky" на список
                    values_list = values.split(',')
                    
                    # Создаем сложный запрос через Q-объекты
                    # Логика: (Value ILIKE 'val1') OR (Value ILIKE 'val2') ...
                    value_query = Q()
                    for v in values_list:
                        # v.strip() убирает лишние пробелы, если они были
                        # icontains = ищет вхождение без учета регистра
                        value_query |= Q(attributes__value__icontains=v.strip())
                    
                    # Применяем фильтр:
                    # 1. Фильтруем по конкретному атрибуту (например, Порода)
                    # 2. И по значению (наша конструкция OR)
                    queryset = queryset.filter(
                        attributes__attribute__slug=attr_slug
                    ).filter(value_query).distinct()
        
        return queryset

    class Meta:
        model = Pet
        fields = ['categories__slug', 'tags__slug', 'is_active', 'is_public']