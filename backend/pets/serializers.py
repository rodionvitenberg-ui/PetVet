from rest_framework import serializers
from datetime import date
from users.serializers import PublicProfileSerializer
from .models import Pet, Category, Attribute, PetAttribute, PetImage, Tag, PetEvent, EventType, PetEventAttachment
from .services import resolve_client
from slugify import slugify as custom_slugify
import uuid

# === СЕРИАЛИЗАТОРЫ СПРАВОЧНИКОВ ===

class TagSerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'target_gender', 'sort_order', 'icon', 'is_universal', 'created_by', 'is_custom']
        read_only_fields = ['slug', 'created_by', 'is_universal', 'is_custom', 'sort_order']

    def get_is_custom(self, obj):
        return obj.created_by is not None

    def validate(self, attrs):
        if 'name' in attrs and not self.instance:
             base_slug = custom_slugify(attrs['name'])
             attrs['slug'] = f"{base_slug}-{str(uuid.uuid4())[:4]}"
        return attrs

class AttributeSerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = Attribute
        fields = ['id', 'name', 'slug', 'unit', 'sort_order', 'icon', 'is_universal', 'created_by', 'is_custom', 'attr_type', 'options']
        read_only_fields = ['slug', 'created_by', 'is_universal', 'is_custom', 'sort_order']

    def get_is_custom(self, obj):
        return obj.created_by is not None

    def validate(self, attrs):
        if 'name' in attrs and not self.instance:
             base_slug = custom_slugify(attrs['name'])
             attrs['slug'] = f"{base_slug}-{str(uuid.uuid4())[:4]}"
        return attrs

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'icon', 'sort_order']

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

class EventTypeSerializer(serializers.ModelSerializer):
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = EventType
        fields = ['id', 'name', 'slug', 'category', 'icon', 'default_schema', 'is_universal', 'is_custom']
        read_only_fields = ['slug', 'created_by', 'is_universal', 'is_custom']

    def get_is_custom(self, obj):
        return obj.created_by is not None


class PetEventAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PetEventAttachment
        # [I-4] Добавлено поле event: без него POST /api/event-attachments/
        # не получал event в validated_data → event.pet в perform_create падал
        # с AttributeError ('NoneType' object has no attribute 'pet').
        fields = ['id', 'event', 'file', 'created_at']
        read_only_fields = ['created_at']


class PetEventSerializer(serializers.ModelSerializer):
    event_type = EventTypeSerializer(read_only=True)
    event_type_id = serializers.PrimaryKeyRelatedField(
        queryset=EventType.objects.all(), 
        source='event_type', 
        write_only=True
    )
    pet = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.all(), 
        required=False, 
        allow_null=True
    )
    pet_info = serializers.SerializerMethodField()
    attachments = PetEventAttachmentSerializer(many=True, read_only=True)
    
    event_type_display = serializers.CharField(source='event_type.name', read_only=True)
    created_by_info = serializers.SerializerMethodField()

    class Meta:
        model = PetEvent
        fields = [
            'id', 'pet', 'event_type', 'event_type_id', 'event_type_display',
            'title', 'description', 'date', 'status', 'next_date',
            'data', 'is_verified', 'attachments', 'created_at', 'created_by_info', 'guest_name', 'guest_phone', 'admin_notes', 'pet_info'
        ]
    
    def get_created_by_info(self, obj):
        """
        Returns info about the user who created this record.
        If it's a vet, includes the clinic name.
        """
        user = obj.created_by
        if not user:
            return None
            
        return {
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "is_vet": user.is_veterinarian,
            "clinic_name": user.clinic_name if user.is_veterinarian else None,
            "avatar": user.avatar.url if user.avatar else None
        }

    def get_pet_info(self, obj):
        if obj.pet:
            # [P-2] Владелец события — через единый резолвер клиента
            client = resolve_client(obj.pet)
            return {
                "id": obj.pet.id,
                "name": obj.pet.name,
                "avatar": obj.pet.images.filter(is_main=True).first().image.url if obj.pet.images.filter(is_main=True).exists() else None,
                "owner_name": client.get('name')
            }
        return None

    def validate(self, data):
        """
        Ensure data integrity.
        """
        pet = data.get('pet')
        guest_name = data.get('guest_name')
        
        if self.instance:
            if 'pet' not in data: pet = self.instance.pet
            if 'guest_name' not in data: guest_name = self.instance.guest_name

        if not pet and not guest_name:
             raise serializers.ValidationError(
                "Event must be linked to a Pet or include a Client name."
            )
        
        return data
    
# === РОДОСЛОВНАЯ ===
class PedigreeSerializer(serializers.ModelSerializer):
    mother = serializers.SerializerMethodField()
    father = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = ['id', 'name', 'slug', 'gender', 'birth_date', 'image', 'mother', 'father']

    def get_image(self, obj):
        img = obj.images.first()
        if img:
            return img.image.url
        return None

    def get_mother(self, obj):
        if obj.mother:
            return PedigreeSerializer(obj.mother, context=self.context).data
        return None

    def get_father(self, obj):
        if obj.father:
            return PedigreeSerializer(obj.father, context=self.context).data
        return None

# === ОСНОВНОЙ СЕРИАЛИЗАТОР ПИТОМЦА ===
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

    owner_info = serializers.SerializerMethodField()
    active_vets = serializers.SerializerMethodField()

    species = serializers.SerializerMethodField()
    breed = serializers.SerializerMethodField()

    temp_owner_phone = serializers.CharField(write_only=True, required=False)
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Pet
        fields = [
            'id', 'owner', 'owner_info', 'name', 'slug', 'description', 'active_vets',
            'gender', 'birth_date', 'age',
            'mother', 'father',
            'categories', 'attributes', 'tags',
            'is_public', 
            'is_active', 'images', 'recent_events', 'created_at',
            'clinic_name', 'clinic',
            'temp_owner_name', 'temp_owner_phone', 'created_by', 'species', 'breed',
        ]
        read_only_fields = ['created_by']
    
    def get_owner_info(self, obj):
        # [P-2] Единый резолвер клиента (Pet → owner | temp_owner)
        return resolve_client(obj)
    
    def get_age(self, obj):
        if not obj.birth_date:
            return None
        today = date.today()
        years = today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        if years == 0:
            months = (today.year - obj.birth_date.year) * 12 + today.month - obj.birth_date.month
            return f"{months} mo"
        return f"{years} yr"

    def get_recent_events(self, obj):
        events = obj.events.all()[:5]
        return PetEventSerializer(events, many=True, context=self.context).data

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
        
        if 'created_by' not in validated_data and self.context.get('request'):
            validated_data['created_by'] = self.context['request'].user
        
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
    
    def get_active_vets(self, obj):
        grants = obj.access_grants.filter(is_active=True).select_related('user')
        vets = [grant.user for grant in grants]
        return PublicProfileSerializer(vets, many=True, context=self.context).data
    
    def get_species(self, obj):
        species_cat = next((cat for cat in obj.categories.all() if cat.parent is None), None)
        return species_cat.name if species_cat else None

    def get_breed(self, obj):
        breed_cat = next((cat for cat in obj.categories.all() if cat.parent is not None), None)
        return breed_cat.name if breed_cat else None
    
    def validate(self, attrs):
        mother = attrs.get('mother')
        father = attrs.get('father')
        birth_date = attrs.get('birth_date')

        if self.instance:
            if 'mother' not in attrs: mother = self.instance.mother
            if 'father' not in attrs: father = self.instance.father
            if 'birth_date' not in attrs: birth_date = self.instance.birth_date

        errors = {}

        if self.instance:
            if mother == self.instance:
                errors['mother'] = "A pet cannot be its own mother."
            if father == self.instance:
                errors['father'] = "A pet cannot be its own father."

        if birth_date:
            if mother and mother.birth_date and mother.birth_date >= birth_date:
                errors['mother'] = f"Chronology error: Mother ({mother.name}) is younger than the child."
            
            if father and father.birth_date and father.birth_date >= birth_date:
                errors['father'] = f"Chronology error: Father ({father.name}) is younger than the child."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs