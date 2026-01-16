import django_filters
from django_filters import rest_framework as filters
from django.db.models import Q
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from .models import Pet

class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    """
    Позволяет фильтровать по списку значений через запятую.
    Пример: ?categories=cat,dog
    """
    pass

class PetFilter(filters.FilterSet):
    """
    Гибридный фильтр: 
    1. Поддерживает старую логику EAV (attributes[slug]=val1,val2)
    2. Добавляет новые фичи (возраст, события, JSON)
    """
    
    # === 1. БАЗОВЫЙ ПОИСК ===
    name = filters.CharFilter(lookup_expr='icontains', label="Поиск по кличке")
    is_active = filters.BooleanFilter()
    is_public = filters.BooleanFilter()
    
    # === 2. КАТЕГОРИИ И ТЕГИ (Множественный выбор) ===
    # Было: categories__slug через getlist
    # Стало: CharInFilter (стандарт DRF для списков через запятую)
    # Пример: ?categories=cat,dog&tags=cute,funny
    categories = CharInFilter(field_name='categories__slug', lookup_expr='in')
    tags = CharInFilter(field_name='tags__slug', lookup_expr='in')

    # Вспомогательные поля для "умного" поиска вида/породы
    species = filters.CharFilter(method='filter_species')
    breed = filters.CharFilter(method='filter_breed')

    # === 3. ВОЗРАСТ (В МЕСЯЦАХ) ===
    # Пример: ?min_age=12 (старше года)
    min_age = filters.NumberFilter(method='filter_min_age', label="Минимальный возраст (мес)")
    max_age = filters.NumberFilter(method='filter_max_age', label="Максимальный возраст (мес)")

    # === 4. СОБЫТИЯ И ИСТОРИЯ ===
    # ?has_event=vaccine (Был ли вакцинирован?)
    has_event = filters.CharFilter(method='filter_has_event')
    
    # ?last_event_after=2024-01-01 (События после даты)
    last_event_after = filters.DateFilter(method='filter_last_event_date')
    # Вспомогательное поле для уточнения типа события при фильтрации по дате
    event_type_slug = filters.CharFilter(field_name='events__event_type__slug')

    # === 5. JSON ФИЛЬТРАЦИЯ (НОВОЕ) ===
    # ?event_data=show|rank:CACIB
    event_data = filters.CharFilter(method='filter_event_json')

    class Meta:
        model = Pet
        fields = ['is_active', 'is_public', 'gender', 'owner']

    # --- МЕТОДЫ ФИЛЬТРАЦИИ ---

    def filter_species(self, queryset, name, value):
        # Ищем категорию верхнего уровня
        return queryset.filter(categories__slug=value, categories__parent__isnull=True)

    def filter_breed(self, queryset, name, value):
        # Ищем категорию-потомка
        return queryset.filter(categories__slug__icontains=value, categories__parent__isnull=False)

    def filter_min_age(self, queryset, name, value):
        if not value: return queryset
        # Родился РАНЬШЕ, чем (сегодня - N месяцев)
        limit_date = timezone.now().date() - relativedelta(months=int(value))
        return queryset.filter(birth_date__lte=limit_date)

    def filter_max_age(self, queryset, name, value):
        if not value: return queryset
        # Родился ПОЗЖЕ, чем (сегодня - N месяцев)
        limit_date = timezone.now().date() - relativedelta(months=int(value))
        return queryset.filter(birth_date__gte=limit_date)

    def filter_has_event(self, queryset, name, value):
        return queryset.filter(events__event_type__slug=value).distinct()

    def filter_last_event_date(self, queryset, name, value):
        event_type = self.data.get('event_type_slug')
        lookup = {'events__date__gte': value}
        if event_type:
            lookup['events__event_type__slug'] = event_type
        return queryset.filter(**lookup).distinct()

    def filter_event_json(self, queryset, name, value):
        try:
            event_slug, criteria = value.split('|', 1)
            json_key, json_val = criteria.split(':', 1)
            return queryset.filter(
                events__event_type__slug=event_slug,
                events__data__contains={json_key: json_val}
            ).distinct()
        except ValueError:
            return queryset

    # --- EAV МАГИЯ (ИЗ ТВОЕГО СТАРОГО ФАЙЛА) ---
    def filter_queryset(self, queryset):
        """
        Переопределяем основной метод, чтобы сохранить поддержку
        формата attributes[breed]=corgi,husky
        """
        # Сначала применяем все стандартные фильтры (возраст, события и т.д.)
        queryset = super().filter_queryset(queryset)
        
        # Теперь проходимся по атрибутам вручную, как в старой версии
        for key, values in self.request.GET.items():
            if key.startswith('attributes[') and key.endswith(']'):
                # attributes[weight] -> weight
                attr_slug = key[key.find('[')+1:key.find(']')]
                
                if values:
                    values_list = values.split(',')
                    
                    # Логика OR для значений одного атрибута
                    value_query = Q()
                    for v in values_list:
                        value_query |= Q(attributes__value__icontains=v.strip())
                    
                    # Применяем фильтр EAV
                    queryset = queryset.filter(
                        attributes__attribute__slug=attr_slug
                    ).filter(value_query).distinct()
        
        return queryset