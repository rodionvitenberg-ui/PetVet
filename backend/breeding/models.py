from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from pets.models import Pet  # Импортируем основную модель

class HeatCycle(models.Model):
    """
    Отслеживание циклов течки у самок (для планирования вязок).
    """
    pet = models.ForeignKey(
        Pet, on_delete=models.CASCADE, 
        related_name='heat_cycles',
        limit_choices_to={'gender': 'F'}, # Только девочки
        verbose_name="Питомец (Самка)"
    )
    start_date = models.DateField(verbose_name="Начало течки")
    end_date = models.DateField(null=True, blank=True, verbose_name="Конец течки")
    notes = models.TextField(blank=True, verbose_name="Заметки")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name = "Цикл (Течка)"
        verbose_name_plural = "Циклы (Течки)"

    def __str__(self):
        return f"{self.pet.name} ({self.start_date})"


class Mating(models.Model):
    """
    Регистрация акта вязки (Случки).
    """
    dam = models.ForeignKey(
        Pet, on_delete=models.CASCADE,
        related_name='matings_as_dam',
        limit_choices_to={'gender': 'F'},
        verbose_name="Мать (Dam)"
    )
    sire = models.ForeignKey(
        Pet, on_delete=models.CASCADE,
        related_name='matings_as_sire',
        limit_choices_to={'gender': 'M'},
        verbose_name="Отец (Sire)"
    )
    date = models.DateField(verbose_name="Дата вязки")
    is_successful = models.BooleanField(default=False, verbose_name="Беременность подтверждена")
    
    # Можно привязать к циклу, чтобы знать, в какую течку вязали
    cycle = models.ForeignKey(
        HeatCycle, on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='matings',
        verbose_name="В рамках цикла"
    )

    class Meta:
        ordering = ['-date']
        verbose_name = "Вязка"
        verbose_name_plural = "Вязки"

    def __str__(self):
        return f"{self.dam.name} + {self.sire.name} ({self.date})"


class Litter(models.Model):
    """
    Помет (Litter). Группа щенков/котят.
    """
    # Буква помета (Litter A, Litter B...)
    litter_code = models.CharField(max_length=50, verbose_name="Код/Буква помета")
    
    dam = models.ForeignKey(
        Pet, on_delete=models.PROTECT, 
        related_name='litters',
        limit_choices_to={'gender': 'F'},
        verbose_name="Мать"
    )
    sire = models.ForeignKey(
        Pet, on_delete=models.PROTECT, 
        related_name='sired_litters',
        limit_choices_to={'gender': 'M'},
        verbose_name="Отец"
    )
    birth_date = models.DateField(verbose_name="Дата рождения")
    
    # Связь с реальными карточками питомцев (детьми)
    offspring = models.ManyToManyField(
        Pet, blank=True, 
        related_name='litter_membership',
        verbose_name="Дети (Карточки)"
    )

    # Статистика
    born_alive = models.PositiveIntegerField(default=0, verbose_name="Рождено живых")
    born_dead = models.PositiveIntegerField(default=0, verbose_name="Мертворожденных")
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='litters'
    )

    class Meta:
        ordering = ['-birth_date']
        verbose_name = "Помет"
        verbose_name_plural = "Пометы"
        unique_together = ['owner', 'litter_code'] # У одного заводчика коды уникальны

    def __str__(self):
        return f"Помет '{self.litter_code}' от {self.birth_date}"