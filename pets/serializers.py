from rest_framework import serializers
from datetime import date
from .models import Pet, Category, Attribute, PetAttribute, PetImage, Tag, HealthEvent

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'target_gender', 'sort_order', 'icon']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'icon', 'sort_order']

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ['id', 'name', 'slug', 'unit', 'sort_order', 'icon']

class PetAttributeSerializer(serializers.ModelSerializer):
    attribute = AttributeSerializer(read_only=True)
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
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    created_by_clinic = serializers.ReadOnlyField(source='created_by.clinic_name')
    created_by_is_vet = serializers.ReadOnlyField(source='created_by.is_veterinarian')

    class Meta:
        model = HealthEvent
        fields = [
            'id', 'pet', 'event_type', 'event_type_display',
            'status', 'status_display',
            'title', 'date', 'next_date', 'description', 'document',
            'created_by_name', 'created_by_clinic', 'created_by_is_vet',
            'is_verified'
        ]
        read_only_fields = ['is_verified', 'created_by']

class PetSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all())
    attributes = PetAttributeSerializer(many=True, required=False)
    images = PetImageSerializer(many=True, read_only=True)
    tags = serializers.SlugRelatedField(many=True, slug_field='slug', queryset=Tag.objects.all(), required=False)
    
    mother = serializers.PrimaryKeyRelatedField(queryset=Pet.objects.filter(gender='F'), required=False, allow_null=True)
    father = serializers.PrimaryKeyRelatedField(queryset=Pet.objects.filter(gender='M'), required=False, allow_null=True)
    
    age = serializers.SerializerMethodField()
    recent_events = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id', 'owner', 'name', 'slug', 'description', 
            'gender', 'birth_date', 'age',
            'mother', 'father',
            'categories', 'attributes', 'tags',
            'is_public', 
            'is_active', 'images', 'recent_events', 'created_at',
            'clinic_name',
        ]

    def get_age(self, obj):
        if not obj.birth_date:
            return None
        today = date.today()
        years = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        if years == 0:
            months = (today.year - obj.birth_date.year) * 12 + today.month - obj.birth_date.month
            return f"{months} мес."
        return f"{years} лет"

    def get_recent_events(self, obj):
        events = obj.events.all()[:5]
        return HealthEventSerializer(events, many=True, context=self.context).data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        representation['categories'] = CategorySerializer(instance.categories.all(), many=True, context=self.context).data
        representation['tags'] = TagSerializer(instance.tags.all(), many=True, context=self.context).data
        
        # Упрощенная логика родителей (без картинок)
        if instance.mother:
            representation['mother_info'] = {
                'id': instance.mother.id,
                'name': instance.mother.name,
                'gender': instance.mother.gender,
            }
            
        if instance.father:
            representation['father_info'] = {
                'id': instance.father.id,
                'name': instance.father.name,
                'gender': instance.father.gender,
            }

        return representation

    def validate(self, data):
        birth_date = data.get('birth_date')
        if self.instance and not birth_date:
            birth_date = self.instance.birth_date

        mother = data.get('mother')
        father = data.get('father')

        if birth_date:
            if mother and mother.birth_date and mother.birth_date >= birth_date:
                raise serializers.ValidationError({'mother': "Мать не может быть моложе ребенка!"})
            if father and father.birth_date and father.birth_date >= birth_date:
                raise serializers.ValidationError({'father': "Отец не может быть моложе ребенка!"})
        
        if self.instance:
            if mother and mother.id == self.instance.id:
                raise serializers.ValidationError({'mother': "Питомец не может быть своей матерью."})
            if father and father.id == self.instance.id:
                raise serializers.ValidationError({'father': "Питомец не может быть своим отцом."})

        return data

    def create(self, validated_data):
        attributes_data = validated_data.pop('attributes', [])
        categories = validated_data.pop('categories', [])
        tags = validated_data.pop('tags', [])
        
        pet = Pet.objects.create(**validated_data)
        
        pet.categories.set(categories)
        pet.tags.set(tags)
        
        for attr_item in attributes_data:
            attr_slug = attr_item.get('attribute_slug')
            value = attr_item.get('value')
            try:
                attribute_obj = Attribute.objects.get(slug=attr_slug)
                PetAttribute.objects.create(pet=pet, attribute=attribute_obj, value=value)
            except Attribute.DoesNotExist:
                pass
        return pet

    def update(self, instance, validated_data):
        attributes_data = validated_data.pop('attributes', [])
        categories = validated_data.pop('categories', [])
        tags = validated_data.pop('tags', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories:
            instance.categories.set(categories)
        if tags:
            instance.tags.set(tags)
            
        if attributes_data:
            for attr_item in attributes_data:
                attr_slug = attr_item.get('attribute_slug')
                value = attr_item.get('value')
                try:
                    attribute_obj = Attribute.objects.get(slug=attr_slug)
                    PetAttribute.objects.update_or_create(
                        pet=instance,
                        attribute=attribute_obj,
                        defaults={'value': value}
                    )
                except Attribute.DoesNotExist:
                    pass
        return instance