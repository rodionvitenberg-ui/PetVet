from rest_framework import serializers
from datetime import date
from .models import Pet, Category, Attribute, PetAttribute, PetImage, Tag, HealthEvent, HealthEventAttachment

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

# === [NEW] Сериализатор для вложений ===
class HealthEventAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthEventAttachment
        fields = ['id', 'file', 'created_at']

class HealthEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    created_by_clinic = serializers.ReadOnlyField(source='created_by.clinic_name')
    created_by_is_vet = serializers.ReadOnlyField(source='created_by.is_veterinarian')
    
    # Вложения (файлы) - только для чтения в этом сериализаторе
    attachments = HealthEventAttachmentSerializer(many=True, read_only=True)

    # Форматирование даты и времени
    date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", input_formats=["%Y-%m-%d %H:%M", "iso-8601"])
    next_date = serializers.DateTimeField(
        format="%Y-%m-%d %H:%M", 
        input_formats=["%Y-%m-%d %H:%M", "iso-8601"], 
        required=False, 
        allow_null=True
    )

    class Meta:
        model = HealthEvent
        fields = [
            'id', 'pet', 'event_type', 'event_type_display',
            'status', 'status_display',
            'title', 'date', 'next_date', 'description', 
            'attachments',  # <-- Вместо document
            'created_by_name', 'created_by_clinic', 'created_by_is_vet',
            'is_verified'
        ]
        read_only_fields = ['is_verified', 'created_by']

class PetSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    images = PetImageSerializer(many=True, read_only=True)
    
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=Category.objects.all(), required=False)
    tags = serializers.SlugRelatedField(many=True, slug_field='slug', queryset=Tag.objects.all(), required=False)
    attributes = PetAttributeSerializer(many=True, required=False)

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
        # Используем prefetch из viewset
        events = obj.events.all()[:5]
        return HealthEventSerializer(events, many=True, context=self.context).data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        representation['categories'] = CategorySerializer(instance.categories.all(), many=True, context=self.context).data
        representation['tags'] = TagSerializer(instance.tags.all(), many=True, context=self.context).data
        representation['attributes'] = PetAttributeSerializer(instance.attributes.all(), many=True, context=self.context).data
        
        def get_parent_data(parent_instance):
            if not parent_instance:
                return None
            images = list(parent_instance.images.all())
            main_img_obj = next((img for img in images if img.is_main), None)
            if not main_img_obj and images:
                main_img_obj = images[0]
                
            return {
                "id": parent_instance.id,
                "name": parent_instance.name,
                "gender": parent_instance.gender,
                "image": main_img_obj.image.url if main_img_obj else None
            }

        representation['mother_info'] = get_parent_data(instance.mother)
        representation['father_info'] = get_parent_data(instance.father)
        
        return representation

    def create(self, validated_data):
        attributes_data = validated_data.pop('attributes', [])
        categories = validated_data.pop('categories', [])
        tags = validated_data.pop('tags', [])
        
        pet = Pet.objects.create(**validated_data)
        
        if categories:
            pet.categories.set(categories)
        if tags:
            pet.tags.set(tags)
            
        if attributes_data:
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