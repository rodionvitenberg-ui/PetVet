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
    """
    Модель для меток (Привит, Чипирован, Племенной, Кастрирован и т.д.)
    """
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

    class Meta:
        verbose_name = "Метка"
        verbose_name_plural = "Метки"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

class Attribute(models.Model):
    """
    Справочник атрибутов (Порода, Окрас, Вес)
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Название атрибута")
    slug = models.SlugField(max_length=100, unique=True)
    unit = models.CharField(max_length=100, blank=True, verbose_name="Единица измерения")
    
    icon = models.FileField(upload_to='attribute_icons/', blank=True, null=True, verbose_name="Иконка (SVG/PNG)")
    sort_order = models.IntegerField(default=0, verbose_name="Порядок вывода")

    class Meta:
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"
        ordering = ['sort_order'] 

    def __str__(self):
        return self.name

class Pet(models.Model):
    """
    Основная модель Питомца.
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        verbose_name="Владелец"
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
    
    is_public = models.BooleanField(default=False, verbose_name="Публичный профиль (В ленту)")
    is_active = models.BooleanField(default=True, verbose_name="Жив / Активен")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

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
        if not self.slug:
            self.slug = pytils.translit.slugify(self.name)
            
            if not self.slug:
                self.slug = str(uuid.uuid4())[:8]
        
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

class HealthEvent(models.Model):
    """
    Медицинская карта / События жизни (Вакцинация, Обработка, Визиты)
    """
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.CASCADE, 
        related_name='events', 
        verbose_name="Питомец"
    )
    
    EVENT_TYPES = [
        ('vaccine', 'Вакцинация'),
        ('parasite', 'Обработка от паразитов (Глисты/Блохи)'),
        ('medical', 'Визит к врачу / Лечение'),
        ('hygiene', 'Гигиена / Уход'),
        ('measure', 'Замеры (Вес/Рост)'),
        ('other', 'Другое'),
    ]
    
    event_type = models.CharField(
        max_length=20, 
        choices=EVENT_TYPES, 
        verbose_name="Тип события"
    )
    
    STATUS_CHOICES = [
        ('planned', 'Запланировано'),
        ('confirmed', 'Подтверждено'),
        ('completed', 'Завершено'),
        ('cancelled', 'Отменено'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='completed', 
        verbose_name="Статус события"
    )

    title = models.CharField(max_length=255, verbose_name="Название")
    
    # === [CHANGED] Теперь DateTimeField для точного времени ===
    date = models.DateTimeField(verbose_name="Время события")
    
    # Напоминание тоже с точным временем
    next_date = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Напоминание (Дата и Время)"
    )
    
    description = models.TextField(blank=True, verbose_name="Заметки / Описание")
    
    # === [REMOVED] document field (перенесено в HealthEventAttachment) ===

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Кем создана запись"
    )
    
    is_verified = models.BooleanField(default=False, verbose_name="Подтверждено врачом")
    
    # История изменений
    history = HistoricalRecords()
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Событие / Запись"
        verbose_name_plural = "Медкарта и События"
        ordering = ['-date']

    def __str__(self):
        return f"{self.pet.name} - {self.title}"

class HealthEventAttachment(models.Model):
    """
    [NEW] Вложения к событию (Фото, PDF, анализы).
    Поддерживает множественную загрузку.
    """
    event = models.ForeignKey(
        HealthEvent, 
        on_delete=models.CASCADE, 
        related_name='attachments',
        verbose_name="Событие"
    )
    file = models.FileField(
        upload_to='health_docs/%Y/%m/',
        verbose_name="Файл"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Вложение (Медкарта)"
        verbose_name_plural = "Вложения (Медкарта)"

    def __str__(self):
        return f"File for {self.event.title}"

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