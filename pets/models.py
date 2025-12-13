from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.exceptions import ValidationError
from simple_history.models import HistoricalRecords
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

    class Meta:
        verbose_name = "Вид/Категория"
        verbose_name_plural = "Виды/Категории"

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
    
    # СОРТИРОВКА: Чем меньше число, тем выше атрибут в списке
    sort_order = models.IntegerField(default=0, verbose_name="Порядок вывода")

    class Meta:
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"
        ordering = ['sort_order'] # <-- Автоматическая сортировка везде

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

    # НОВЫЕ ПОЛЯ: ВОЗРАСТ И РОДИТЕЛИ
    birth_date = models.DateField(null=True, blank=True, verbose_name="Дата рождения")

    # Родословная (Ссылки на самих себя)
    # limit_choices_to помогает в админке показывать только девочек для мамы и мальчиков для папы
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
        # 1. Проверка на возраст родителей
        if self.birth_date:
            if self.mother and self.mother.birth_date and self.mother.birth_date >= self.birth_date:
                raise ValidationError({'mother': "Мать не может быть моложе ребенка!"})
            if self.father and self.father.birth_date and self.father.birth_date >= self.birth_date:
                raise ValidationError({'father': "Отец не может быть моложе ребенка!"})
        
        # 2. Проверка, чтобы питомец не был своим родителем (защита от дурака)
        if self.mother == self or self.father == self:
             raise ValidationError("Питомец не может быть своим собственным родителем.")

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=True)
            if not base_slug:
                base_slug = str(uuid.uuid4())[:8]
            self.slug = base_slug
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
    
    # --- НОВОЕ ПОЛЕ: СТАТУС ---
    STATUS_CHOICES = [
        ('planned', 'Запланировано'),   # В будущем (серенькое)
        ('confirmed', 'Подтверждено'),  # Клиент подтвердил визит
        ('completed', 'Завершено'),     # Сделано! (Вешаем тег)
        ('cancelled', 'Отменено'),      # Не пришли
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='completed', # Для обратной совместимости старые записи считаем выполненными
        verbose_name="Статус события"
    )

    title = models.CharField(max_length=255, verbose_name="Название (например, Нобивак)")
    date = models.DateField(verbose_name="Дата события")
    
    next_date = models.DateField(
        null=True, 
        blank=True, 
        verbose_name="Дата следующего (Напоминание)"
    )
    
    description = models.TextField(blank=True, verbose_name="Заметки / Описание")
    
    document = models.FileField(
        upload_to='health_docs/', 
        null=True, 
        blank=True, 
        verbose_name="Документ / Фото"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Кем создана запись"
    )
    
    is_verified = models.BooleanField(default=False, verbose_name="Подтверждено врачом")
    
    # История изменений (Audit Log)
    history = HistoricalRecords()
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Событие / Запись"
        verbose_name_plural = "Медкарта и События"
        ordering = ['-date']

    def __str__(self):
        return f"{self.pet.name} - {self.title} ({self.get_status_display()})"