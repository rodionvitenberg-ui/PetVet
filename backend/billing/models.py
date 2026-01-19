from django.db import models
from django.conf import settings
from pets.models import Pet, PetEvent

class CatalogItem(models.Model):
    """
    Единый справочник товаров и услуг.
    """
    TYPE_CHOICES = [
        ('service', 'Услуга'),
        ('good', 'Товар'),
    ]
    
    name = models.CharField("Название", max_length=200)
    code = models.CharField(
        "Код / Артикул / GOT", 
        max_length=50, 
        unique=True, 
        help_text="Уникальный код. Для Германии здесь будет номер GOT."
    )
    item_type = models.CharField("Тип", max_length=10, choices=TYPE_CHOICES, default='service')
    
    price = models.DecimalField("Цена", max_digits=10, decimal_places=2)
    tax_percent = models.DecimalField(
        "Налог % (НДС/VAT)", 
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="Если 0 - налог не считается"
    )

    is_stock_tracked = models.BooleanField("Учитывать остатки?", default=False)
    stock_quantity = models.IntegerField("Остаток на складе", default=0)
    
    description = models.TextField("Описание", blank=True)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # [FIX] Добавил null=True, blank=True, чтобы миграции не падали
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='catalog_items',
        verbose_name="Владелец",
        null=True, 
        blank=True
    )
    
    is_global = models.BooleanField("Общий шаблон?", default=False)

    def __str__(self):
        return f"[{self.code}] {self.name} ({self.price} €)"

    class Meta:
        verbose_name = "Товар/Услуга"
        verbose_name_plural = "Каталог услуг"


# === НОВЫЕ МОДЕЛИ ДЛЯ МАКРОСОВ (ШАБЛОНОВ) ===
class EventTemplate(models.Model):
    """
    Макрос: готовый набор текста и услуг.
    Например: 'Кастрация кота' -> Текст осмотра + Наркоз + Работа.
    """
    name = models.CharField("Название шаблона", max_length=100)
    description_template = models.TextField("Шаблон описания (текст)", blank=True)
    
    # Привязка к врачу (каждый видит свои шаблоны)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_templates',
        null=True, blank=True
    )
    is_global = models.BooleanField("Общий шаблон?", default=False)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Шаблон приема"
        verbose_name_plural = "Шаблоны приемов"

class TemplateItem(models.Model):
    """Какие товары входят в этот шаблон"""
    template = models.ForeignKey(EventTemplate, related_name='items', on_delete=models.CASCADE)
    item = models.ForeignKey(CatalogItem, on_delete=models.CASCADE, verbose_name="Товар")
    quantity = models.IntegerField("Количество", default=1)

    def __str__(self):
        return f"{self.item.name} x{self.quantity}"


# === МОДЕЛИ СЧЕТОВ ===
class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('unpaid', 'Ожидает оплаты'),
        ('paid', 'Оплачен'),
        ('cancelled', 'Отменен')
    ]

    PAYMENT_METHODS = [
        ('cash', 'Наличные'),
        ('card', 'Карта'),
        ('insurance', 'Страховая'),
        ('mixed', 'Смешанный')
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Клиент (Аккаунт)"
    )
    guest_name = models.CharField("Имя клиента (Гость)", max_length=100, blank=True, null=True)
    
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Пациент"
    )
    event = models.ForeignKey(
        PetEvent, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Связанное событие"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='card')
    
    total_amount = models.DecimalField("Итого к оплате", max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField("Сумма налога", max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField("Скидка", max_digits=12, decimal_places=2, default=0)

    notes = models.TextField("Заметки", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField("Дата оплаты", null=True, blank=True)

    def __str__(self):
        name = self.client.get_full_name() if self.client else (self.guest_name or "Аноним")
        return f"Чек #{self.id} - {name} ({self.total_amount})"

    def calculate_totals(self):
        items = self.items.all()
        total = sum(item.subtotal for item in items)
        self.total_amount = total - self.discount_amount
        self.save(update_fields=['total_amount'])

    class Meta:
        verbose_name = "Счет"
        verbose_name_plural = "Счета"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    item = models.ForeignKey(CatalogItem, on_delete=models.PROTECT, verbose_name="Товар из каталога")
    
    name_at_moment = models.CharField("Название в чеке", max_length=200)
    price_at_moment = models.DecimalField("Цена за единицу", max_digits=10, decimal_places=2)
    tax_percent_at_moment = models.DecimalField("Налог %", max_digits=5, decimal_places=2, default=0)
    
    quantity = models.IntegerField("Количество", default=1)
    subtotal = models.DecimalField("Сумма строки", max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        if not self.id:
            self.name_at_moment = self.item.name
            self.price_at_moment = self.item.price
            self.tax_percent_at_moment = self.item.tax_percent
        
        self.subtotal = self.price_at_moment * self.quantity
        super().save(*args, **kwargs)
        self.invoice.calculate_totals()

    def __str__(self):
        return f"{self.name_at_moment} x{self.quantity}"

    class Meta:
        verbose_name = "Позиция чека"
        verbose_name_plural = "Позиции чека"