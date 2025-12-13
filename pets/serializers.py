from rest_framework import serializers
from datetime import date
from django.db import transaction
from .models import Pet, Category, Attribute, PetAttribute, PetImage, Tag, HealthEvent

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'target_gender', 'sort_order']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent']

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ['id', 'name', 'slug', 'unit', 'sort_order']

class PetAttributeSerializer(serializers.ModelSerializer):
    # Для чтения показываем полную инфу об атрибуте
    attribute = AttributeSerializer(read_only=True)
    
    # Для записи нам нужен slug атрибута (например, "color")
    attribute_slug = serializers.CharField(write_only=True)

    class Meta:
        model = PetAttribute
        fields = ['attribute', 'value', 'attribute_slug']

class PetImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PetImage
        fields = ['id', 'image', 'is_main']

class HealthEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    # Информация об авторе
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    
    # Выводим название клиники, если это врач (иначе будет null)
    created_by_clinic = serializers.ReadOnlyField(source='created_by.clinic_name')
    
    # Выводим статус автора (Врач или нет) для красивого бейджика на фронте
    created_by_is_vet = serializers.ReadOnlyField(source='created_by.is_veterinarian')

    class Meta:
        model = HealthEvent
        fields = [
            'id', 'pet', 'event_type', 'event_type_display', 
            'title', 'date', 'next_date', 'description', 'document',
            'created_by_name', 'created_by_clinic', 'created_by_is_vet', # <-- Инфо об авторе
            'is_verified' # <-- Статус записи (Галочка)
        ]
        # ВАЖНО: Запрещаем юзеру писать в это поле вручную
        read_only_fields = ['is_verified', 'created_by']    # Выводим человекочитаемое название типа события
   

class PetSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all()
    )
    # EAV Атрибуты: разрешаем и чтение, и запись
    attributes = PetAttributeSerializer(many=True, required=False)
    
    images = PetImageSerializer(many=True, read_only=True)
    tags = serializers.SlugRelatedField(
        many=True, 
        slug_field='slug', 
        queryset=Tag.objects.all(),
        required=False
    )
    
    # Родословная: принимаем ID, отдаем строку (или можно вложенный объект, пока ID проще)
    mother = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.filter(gender='F'), 
        required=False, 
        allow_null=True
    )
    father = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.filter(gender='M'), 
        required=False, 
        allow_null=True
    )
    
    # Вычисляемое поле возраста
    age = serializers.SerializerMethodField()
    
    # Показываем последние 3 события (чтобы не грузить всё сразу)
    recent_events = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id', 'owner', 'name', 'slug', 'description', 
            'gender', 'birth_date', 'age', # <-- Новые поля
            'mother', 'father', # <-- Родословная
            'categories', 'attributes', 'tags',
            'is_public', 
            'is_active', 'images', 'recent_events', 'created_at',
        ]

    def get_age(self, obj):
        """Считаем возраст: 2 года, 5 месяцев"""
        if not obj.birth_date:
            return None
        today = date.today()
        years = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        
        if years == 0:
            months = (today.year - obj.birth_date.year) * 12 + today.month - obj.birth_date.month
            return f"{months} мес."
        return f"{years} лет"

    def get_recent_events(self, obj):
        # Берем 3 последних события
        events = obj.events.all()[:3]
        return HealthEventSerializer(events, many=True).data

    def create(self, validated_data):
        """
        Кастомное создание для поддержки вложенных EAV-атрибутов
        """
        attributes_data = validated_data.pop('attributes', [])
        categories = validated_data.pop('categories', [])
        tags = validated_data.pop('tags', [])
        
        # Создаем питомца
        pet = Pet.objects.create(**validated_data)
        
        # Связываем M2M
        pet.categories.set(categories)
        pet.tags.set(tags)
        
        # Обрабатываем атрибуты
        for attr_item in attributes_data:
            attr_slug = attr_item.get('attribute_slug')
            value = attr_item.get('value')
            try:
                attribute_obj = Attribute.objects.get(slug=attr_slug)
                PetAttribute.objects.create(pet=pet, attribute=attribute_obj, value=value)
            except Attribute.DoesNotExist:
                pass # Или рейзить ошибку, если строго
                
        return pet

    def update(self, instance, validated_data):
        """
        Кастомное обновление для EAV
        """
        attributes_data = validated_data.pop('attributes', [])
        categories = validated_data.pop('categories', [])
        tags = validated_data.pop('tags', [])

        # Обновляем стандартные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Обновляем M2M
        if categories:
            instance.categories.set(categories)
        if tags:
            instance.tags.set(tags)
            
        # Обновляем Атрибуты (Удаляем старые и пишем новые, либо обновляем)
        # Простая стратегия: обновляем значения по слагу
        if attributes_data:
            # Можно очистить старые, если логика "полная замена":
            # instance.attributes.all().delete()
            
            for attr_item in attributes_data:
                attr_slug = attr_item.get('attribute_slug')
                value = attr_item.get('value')
                try:
                    attribute_obj = Attribute.objects.get(slug=attr_slug)
                    # update_or_create - если есть, обновит значение, если нет - создаст
                    PetAttribute.objects.update_or_create(
                        pet=instance,
                        attribute=attribute_obj,
                        defaults={'value': value}
                    )
                except Attribute.DoesNotExist:
                    pass
                    
        return instance