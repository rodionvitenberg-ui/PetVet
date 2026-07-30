from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from simple_history.models import HistoricalRecords
import pytils
import uuid

class Category(models.Model):
    """
    Модель Вида/Категории животного (Кошки, Собаки, КРС, Птицы)
    """
    name = models.CharField(max_length=200, verbose_name="Name")
    slug = models.SlugField(max_length=200, unique=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name="Parent category"
    )
    tags = models.ManyToManyField('Tag', blank=True, verbose_name="Category tags")
    attributes = models.ManyToManyField('Attribute', blank=True, verbose_name="Available attributes")

    icon = models.FileField(
        upload_to='category_icons/', 
        null=True, 
        blank=True, 
        verbose_name="Icon (SVG/PNG)"
    )
    sort_order = models.IntegerField(
        default=0, 
        verbose_name="Sort order"
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Tag name")
    slug = models.SlugField(max_length=100, unique=True)

    GENDER_CHOICES = [('M', 'Male only'), ('F', 'Female only')]
    target_gender = models.CharField(
        max_length=1, 
        choices=GENDER_CHOICES, 
        null=True, 
        blank=True, 
        verbose_name="Target gender"
    )
    icon = models.FileField(upload_to='attribute_icons/', blank=True, null=True, verbose_name="Icon (SVG/PNG)")
    sort_order = models.IntegerField(default=0, verbose_name="Sort order")

    is_universal = models.BooleanField(
        default=False, 
        verbose_name="Universal (applies to all species)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True, 
        related_name='custom_tags', 
        verbose_name="Created by (if custom)"
    )

    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class Attribute(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Attribute name")
    slug = models.SlugField(max_length=100, unique=True)
    unit = models.CharField(max_length=100, blank=True, verbose_name="Unit of measurement")
    icon = models.FileField(upload_to='attribute_icons/', blank=True, null=True, verbose_name="Icon (SVG/PNG)")
    sort_order = models.IntegerField(default=0, verbose_name="Sort order")

    is_universal = models.BooleanField(
        default=False, 
        verbose_name="Universal (applies to all species)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='custom_attributes', 
        verbose_name="Created by (if custom)"
    )
    
    ATTR_TYPES = (
        ('text', 'Text'),
        ('number', 'Number'),
        ('select', 'Select (dropdown)'),
        ('checkbox', 'Yes/No (Checkbox)'),
        ('date', 'Date'),
    )

    attr_type = models.CharField(
        max_length=20, 
        choices=ATTR_TYPES, 
        default='text',
        verbose_name="Input type"
    )
    
    options = models.JSONField(
        default=list,
        blank=True, 
        verbose_name="Dropdown options",
        help_text="Only for 'Select' type. Example: ['Short', 'Long']"
    )

    class Meta:
        verbose_name = "Attribute"
        verbose_name_plural = "Attributes"
        ordering = ['sort_order'] 

    def __str__(self):
        return f"{self.name} ({self.get_attr_type_display()})"

class Pet(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        verbose_name="Owner",
        null=True,
        blank=True
    )
    name = models.CharField(max_length=255, verbose_name="Name")
    slug = models.SlugField(max_length=255, unique=True, verbose_name="URL slug", blank=True)
    description = models.TextField(verbose_name="Description", blank=True)
    
    categories = models.ManyToManyField(Category, related_name='pets', verbose_name="Species/Category")
    tags = models.ManyToManyField(Tag, blank=True, verbose_name="Tags")

    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female')]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, verbose_name="Sex")

    clinic_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Clinic")
    clinic = models.ForeignKey(
        'vetclinics.VetClinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients',
        verbose_name="Clinic"
    )
    birth_date = models.DateField(null=True, blank=True, verbose_name="Birth date")
    mother = models.ForeignKey(
        'self', 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name='offspring_mother', 
        verbose_name="Mother",
        limit_choices_to={'gender': 'F'} 
    )
    father = models.ForeignKey(
        'self', 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name='offspring_father', 
        verbose_name="Father",
        limit_choices_to={'gender': 'M'}
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_pets',
        verbose_name="Created by (Vet)",
        null=True, 
        blank=True
    )

    temp_owner_name = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Temporary owner name"
    )

    temp_owner_phone = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Temporary owner phone",
        db_index=True 
    )

    is_public = models.BooleanField(default=False, verbose_name="Public profile")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created at")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pet_profile', # Чтобы от юзера получить профиль: user.pet_profile
        null=True, 
        blank=True
    )

    class Meta:
        verbose_name = "Pet"
        verbose_name_plural = "Pets"

    def __str__(self):
        return self.name

    def clean(self):
        """
        Validate parent-child chronology before saving.
        """
        if self.birth_date:
            if self.mother and self.mother.birth_date and self.mother.birth_date >= self.birth_date:
                raise ValidationError({'mother': "Mother cannot be younger than the child!"})
            if self.father and self.father.birth_date and self.father.birth_date >= self.birth_date:
                raise ValidationError({'father': "Father cannot be younger than the child!"})
        
        if self.mother == self or self.father == self:
             raise ValidationError("A pet cannot be its own parent.")

    def save(self, *args, **kwargs):
        # Если слага еще нет (создание нового питомца)
        if not self.slug:
            # 1. Сначала транслитерируем имя (Барсик -> barsik)
            base_slug = pytils.translit.slugify(self.name)
            
            # Если имя состояло из смайликов или спецсимволов и слаг пустой - берем 'pet'
            if not base_slug:
                base_slug = 'pet'
            
            # 2. Генерируем короткий уникальный хвост (4 символа)
            unique_tail = str(uuid.uuid4())[:4]
            
            # 3. Собираем итоговый слаг: barsik-a1b2
            self.slug = f"{base_slug}-{unique_tail}"
            
            # 4. (Параноидальная проверка) На случай, если хвост совпал (шанс 1 на миллион)
            # Если такой слаг уже есть в БД — перегенерируем хвост подлиннее
            while Pet.objects.filter(slug=self.slug).exists():
                unique_tail = str(uuid.uuid4())[:6]
                self.slug = f"{base_slug}-{unique_tail}"
        
        super().save(*args, **kwargs)

class PetImage(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='images', verbose_name="Pet")
    image = models.ImageField(upload_to='pet_images/', verbose_name="Image")
    is_main = models.BooleanField(default=False, verbose_name="Main photo")

    class Meta:
        verbose_name = "Pet photo"
        verbose_name_plural = "Pet photos"

    def __str__(self):
        return f"Photo of {self.pet.name}"

class PetAttribute(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='attributes', verbose_name="Pet")
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, verbose_name="Attribute")
    value = models.CharField(max_length=255, verbose_name="Value")

    class Meta:
        verbose_name = "Pet characteristic"
        verbose_name_plural = "Pet characteristics"
        unique_together = ('pet', 'attribute')

    def __str__(self):
        return f"{self.pet.name} - {self.attribute.name}: {self.value}"

class EventType(models.Model):
    """
    Reference catalog of event types (Vaccination, Mating, Show, Grooming, etc.)
    """
    CATEGORY_CHOICES = [
        ('medical', 'Medical'),
        ('reproduction', 'Reproduction'),
        ('show', 'Shows & Documents'),
        ('care', 'Care & Hygiene'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=100, verbose_name="Name")
    slug = models.SlugField(max_length=100, unique=True)
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='other', 
        verbose_name="Category"
    )
    icon = models.FileField(upload_to='event_icons/', null=True, blank=True, verbose_name="Icon")
    
    # JSON schema for frontend (which fields to show)
    # Example: {"fields": [{"name": "judge", "label": "Judge", "type": "text"}]}
    default_schema = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="JSON Field Schema (Metadata Schema)"
    )

    # Visibility settings (same pattern as Tag/Attribute)
    is_universal = models.BooleanField(default=True, verbose_name="Universal (for all)")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='custom_event_types',
        verbose_name="Created by"
    )

    class Meta:
        verbose_name = "Event type"
        verbose_name_plural = "Event types"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class PetEvent(models.Model):
    """
    A specific event in a pet's life.
    """
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.CASCADE, 
        related_name='events',
        verbose_name="Pet",
        null=True,
        blank=True
    )
    event_type = models.ForeignKey(
        EventType,
        on_delete=models.PROTECT,
        related_name='events',
        verbose_name="Event type"
    )
    title = models.CharField(max_length=200, verbose_name="Title")
    description = models.TextField(blank=True, verbose_name="Description")
    date = models.DateTimeField(verbose_name="Date and time")

    guest_name = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Guest name"
    )
    guest_phone = models.CharField(
        max_length=50, 
        null=True, 
        blank=True, 
        verbose_name="Guest phone"
    )
    
    admin_notes = models.TextField(
        null=True, 
        blank=True, 
        verbose_name="Admin notes"
    )
    
    # Flexible data (JSON)
    # Stores: {"judge": "Ivanov", "weight": 5.4, "rank": "CACIB"}
    data = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="Additional data (Metadata)"
    )

    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='completed', 
        verbose_name="Status"
    )
    next_date = models.DateTimeField(null=True, blank=True, verbose_name="Next event date")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Link to creator (record author)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Record author"
    )
    is_verified = models.BooleanField(default=False, verbose_name="Verified by veterinarian")

    class Meta:
        verbose_name = "Pet event"
        verbose_name_plural = "Pet events"
        ordering = ['-date']

    def __str__(self):
        return f"{self.event_type.name}: {self.title} ({self.pet.name})"


class PetEventAttachment(models.Model):
    event = models.ForeignKey(
        PetEvent, 
        on_delete=models.CASCADE, 
        related_name='attachments',
        verbose_name="Event"
    )
    file = models.FileField(upload_to='event_docs/%Y/%m/', verbose_name="File")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Attachment"
        verbose_name_plural = "Attachments"

class PetAccess(models.Model):
    """
    Access management (Vets <-> Pets).
    """
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.CASCADE, 
        related_name='access_grants',
        verbose_name="Pet"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='granted_accesses',
        verbose_name="Who has access (Vet)"
    )
    
    ACCESS_LEVELS = [
        ('read', 'Read only'),
        ('write', 'Read and Write'),
    ]
    access_level = models.CharField(max_length=10, choices=ACCESS_LEVELS, default='read')
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name="Active")

    class Meta:
        verbose_name = "Access to pet"
        verbose_name_plural = "Accesses to pets"
        unique_together = ('pet', 'user') # One vet - one record per pet

    def __str__(self):
        return f"Access: {self.user} -> {self.pet}"
