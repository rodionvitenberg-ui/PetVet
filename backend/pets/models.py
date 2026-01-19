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
    name = models.CharField(max_length=200, verbose_name="Название вида/категории")
    slug = models.SlugField(max_length=200, unique=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name="Родительская категория"
    )
    tags = models.ManyToManyField('Tag', blank=True, verbose_name="Метки категории")
    attributes = models.ManyToManyField('Attribute', blank=True, verbose_name="Доступные атрибуты")

    icon = models.FileField(
        upload_to='category_icons/', 
        null=True, 
        blank=True, 
        verbose_name="Иконка (SVG/PNG)"
    )
    sort_order = models.IntegerField(
        default=0, 
        verbose_name="Порядок вывода"
    )

    class Meta:
        verbose_name = "Вид/Категория"
        verbose_name_plural = "Виды/Категории"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Название метки")
    slug = models.SlugField(max_length=100, unique=True)

    GENDER_CHOICES = [('M', 'Только мальчики'), ('F', 'Только девочки')]
    target_gender = models.CharField(
        max_length=1, 
        choices=GENDER_CHOICES, 
        null=True, 
        blank=True, 
        verbose_name="Ограничение по полу"
    )
    icon = models.FileField(upload_to='attribute_icons/', blank=True, null=True, verbose_name="Иконка (SVG/PNG)")
    sort_order = models.IntegerField(default=0, verbose_name="Порядок вывода")

    is_universal = models.BooleanField(
        default=False, 
        verbose_name="Универсальный (для всех видов)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True, 
        related_name='custom_tags', 
        verbose_name="Создатель (если кастомный)"
    )

    class Meta:
        verbose_name = "Метка"
        verbose_name_plural = "Метки"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class Attribute(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Название атрибута")
    slug = models.SlugField(max_length=100, unique=True)
    unit = models.CharField(max_length=100, blank=True, verbose_name="Единица измерения")
    icon = models.FileField(upload_to='attribute_icons/', blank=True, null=True, verbose_name="Иконка (SVG/PNG)")
    sort_order = models.IntegerField(default=0, verbose_name="Порядок вывода")

    is_universal = models.BooleanField(
        default=False, 
        verbose_name="Универсальный (для всех видов)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, # Если юзера удалят, атрибут останется (можно поменять на CASCADE)
        null=True, 
        blank=True, 
        related_name='custom_attributes', 
        verbose_name="Создатель (если кастомный)"
    )

    class Meta:
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"
        ordering = ['sort_order'] 

    def __str__(self):
        return self.name

class Pet(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        verbose_name="Владелец",
        null=True,
        blank=True
    )
    name = models.CharField(max_length=255, verbose_name="Кличка / Инвентарный номер")
    slug = models.SlugField(max_length=255, unique=True, verbose_name="URL-слаг", blank=True)
    description = models.TextField(verbose_name="Заметки / Описание", blank=True)
    
    categories = models.ManyToManyField(Category, related_name='pets', verbose_name="Вид/Категория")
    tags = models.ManyToManyField(Tag, blank=True, verbose_name="Метки")

    GENDER_CHOICES = [('M', 'Мальчик'), ('F', 'Девочка')]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, verbose_name="Пол")

    clinic_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ветклиника")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")
    mother = models.ForeignKey(
        'self', 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name='offspring_mother', 
        verbose_name="Мать",
        limit_choices_to={'gender': 'F'} 
    )
    father = models.ForeignKey(
        'self', 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name='offspring_father', 
        verbose_name="Отец",
        limit_choices_to={'gender': 'M'}
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_pets',
        verbose_name="Кем создана карточка (Врач)",
        null=True, 
        blank=True
    )

    temp_owner_name = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Имя владельца (Временное)"
    )

    temp_owner_phone = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        verbose_name="Телефон владельца (для связи)",
        db_index=True 
    )

    is_public = models.BooleanField(default=False, verbose_name="Публичный профиль (В ленту)")
    is_active = models.BooleanField(default=True, verbose_name="Жив / Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pet_profile', # Чтобы от юзера получить профиль: user.pet_profile
        null=True, 
        blank=True
    )

    class Meta:
        verbose_name = "Питомец"
        verbose_name_plural = "Питомцы"

    def __str__(self):
        return self.name

    def clean(self):
        """
        Проверка логики (Валидация) перед сохранением
        """
        if self.birth_date:
            if self.mother and self.mother.birth_date and self.mother.birth_date >= self.birth_date:
                raise ValidationError({'mother': "Мать не может быть моложе ребенка!"})
            if self.father and self.father.birth_date and self.father.birth_date >= self.birth_date:
                raise ValidationError({'father': "Отец не может быть моложе ребенка!"})
        
        if self.mother == self or self.father == self:
             raise ValidationError("Питомец не может быть своим собственным родителем.")

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
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='images', verbose_name="Питомец")
    image = models.ImageField(upload_to='pet_images/', verbose_name="Изображение")
    is_main = models.BooleanField(default=False, verbose_name="Основное фото")

    class Meta:
        verbose_name = "Фото питомца"
        verbose_name_plural = "Фото питомцев"

    def __str__(self):
        return f"Фото {self.pet.name}"

class PetAttribute(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='attributes', verbose_name="Питомец")
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, verbose_name="Атрибут")
    value = models.CharField(max_length=255, verbose_name="Значение")

    class Meta:
        verbose_name = "Характеристика питомца"
        verbose_name_plural = "Характеристики питомцев"
        unique_together = ('pet', 'attribute')

    def __str__(self):
        return f"{self.pet.name} - {self.attribute.name}: {self.value}"

class EventType(models.Model):
    """
    Справочник типов событий (Вакцинация, Вязка, Выставка, Груминг и т.д.)
    """
    CATEGORY_CHOICES = [
        ('medical', 'Медицина'),
        ('reproduction', 'Репродукция'),
        ('show', 'Выставки и Документы'),
        ('care', 'Уход и Гигиена'),
        ('other', 'Другое'),
    ]

    name = models.CharField(max_length=100, verbose_name="Название")
    slug = models.SlugField(max_length=100, unique=True)
    category = models.CharField(
        max_length=20, 
        choices=CATEGORY_CHOICES, 
        default='other', 
        verbose_name="Категория"
    )
    icon = models.FileField(upload_to='event_icons/', null=True, blank=True, verbose_name="Иконка")
    
    # JSON-схема для фронтенда (какие поля показывать)
    # Пример: {"fields": [{"name": "judge", "label": "Судья", "type": "text"}]}
    default_schema = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="JSON Схема полей (Metadata Schema)"
    )

    # Настройки видимости (как в Tag/Attribute)
    is_universal = models.BooleanField(default=True, verbose_name="Общий для всех")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='custom_event_types',
        verbose_name="Создатель"
    )

    class Meta:
        verbose_name = "Тип события"
        verbose_name_plural = "Типы событий"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class PetEvent(models.Model): # Бывший HealthEvent
    """
    Конкретное событие в жизни питомца.
    """
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.CASCADE, 
        related_name='events', # Переименовали recent_events -> events для краткости
        verbose_name="Питомец",
        null=True,
        blank=True
    )
    event_type = models.ForeignKey(
        EventType,
        on_delete=models.PROTECT, # Нельзя удалить тип, если есть события
        related_name='events',
        verbose_name="Тип события"
    )
    title = models.CharField(max_length=200, verbose_name="Заголовок")
    description = models.TextField(blank=True, verbose_name="Описание")
    date = models.DateTimeField(verbose_name="Дата и время события")

    guest_name = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Имя клиента (Гость)"
    )
    guest_phone = models.CharField(
        max_length=50, 
        null=True, 
        blank=True, 
        verbose_name="Телефон (Гость)"
    )
    
    admin_notes = models.TextField(
        null=True, 
        blank=True, 
        verbose_name="Заметки администратора"
    )
    
    # Гибкие данные (JSON)
    # Здесь храним: {"judge": "Иванов", "weight": 5.4, "rank": "CACIB"}
    data = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="Дополнительные данные (Metadata)"
    )

    STATUS_CHOICES = [
        ('planned', 'Запланировано'),
        ('completed', 'Выполнено'),
        ('missed', 'Пропущено'),
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='completed', 
        verbose_name="Статус"
    )
    next_date = models.DateTimeField(null=True, blank=True, verbose_name="Дата следующего события")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Привязка к создателю (автору записи)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Автор записи"
    )
    is_verified = models.BooleanField(default=False, verbose_name="Подтверждено врачом")

    class Meta:
        verbose_name = "Событие питомца"
        verbose_name_plural = "События питомца"
        ordering = ['-date']

    def __str__(self):
        return f"{self.event_type.name}: {self.title} ({self.pet.name})"


class PetEventAttachment(models.Model): # Бывший HealthEventAttachment
    event = models.ForeignKey(
        PetEvent, 
        on_delete=models.CASCADE, 
        related_name='attachments',
        verbose_name="Событие"
    )
    file = models.FileField(upload_to='event_docs/%Y/%m/', verbose_name="Файл")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Вложение"
        verbose_name_plural = "Вложения"

class PetAccess(models.Model):
    """
    [NEW] Управление доступом (Врачи <-> Питомцы).
    """
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.CASCADE, 
        related_name='access_grants',
        verbose_name="Питомец"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='granted_accesses',
        verbose_name="Кому предоставлен доступ (Врач)"
    )
    
    ACCESS_LEVELS = [
        ('read', 'Только просмотр'),
        ('write', 'Просмотр и Запись'),
    ]
    access_level = models.CharField(max_length=10, choices=ACCESS_LEVELS, default='read')
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        verbose_name = "Доступ к питомцу"
        verbose_name_plural = "Доступы к питомцам"
        unique_together = ('pet', 'user') # Один врач - одна запись на питомца

    def __str__(self):
        return f"Access: {self.user} -> {self.pet}"