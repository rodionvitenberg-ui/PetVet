from django.db import models
from django.conf import settings
from pets.models import Pet, PetEvent

class CatalogItem(models.Model):
    """
    Unified catalog of products and services.
    """
    TYPE_CHOICES = [
        ('service', 'Service'),
        ('good', 'Good'),
    ]
    
    name = models.CharField("Name", max_length=200)
    code = models.CharField(
        "Code / SKU / GOT", 
        max_length=50, 
        unique=True, 
        help_text="Unique code. For Germany this would be the GOT number."
    )
    item_type = models.CharField("Type", max_length=10, choices=TYPE_CHOICES, default='service')
    
    price = models.DecimalField("Price", max_digits=10, decimal_places=2)
    tax_percent = models.DecimalField(
        "Tax % (VAT/GST)", 
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        help_text="If 0, tax is not calculated"
    )

    is_stock_tracked = models.BooleanField("Track stock?", default=False)
    stock_quantity = models.IntegerField("Stock quantity", default=0)
    
    description = models.TextField("Description", blank=True)
    is_active = models.BooleanField("Active", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='catalog_items',
        verbose_name="Owner",
        null=True, 
        blank=True
    )
    
    is_global = models.BooleanField("Global template?", default=False)

    def __str__(self):
        return f"[{self.code}] {self.name} ({self.price} €)"

    class Meta:
        verbose_name = "Catalog Item"
        verbose_name_plural = "Catalog"


class EventTemplate(models.Model):
    """
    Macro: pre-built text and service bundle.
    Example: 'Cat Neutering' -> Surgery notes + Anesthesia + Labor.
    """
    name = models.CharField("Template name", max_length=100)
    description_template = models.TextField("Description template (text)", blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='event_templates',
        null=True, blank=True
    )
    is_global = models.BooleanField("Global template?", default=False)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Examination template"
        verbose_name_plural = "Examination templates"

class TemplateItem(models.Model):
    """Which items are included in this template"""
    template = models.ForeignKey(EventTemplate, related_name='items', on_delete=models.CASCADE)
    item = models.ForeignKey(CatalogItem, on_delete=models.CASCADE, verbose_name="Item")
    quantity = models.IntegerField("Quantity", default=1)

    def __str__(self):
        return f"{self.item.name} x{self.quantity}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('unpaid', 'Awaiting Payment'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled')
    ]

    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('insurance', 'Insurance'),
        ('mixed', 'Mixed')
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Client (Account)"
    )
    guest_name = models.CharField("Guest name", max_length=100, blank=True, null=True)
    
    pet = models.ForeignKey(
        Pet, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Patient"
    )
    event = models.ForeignKey(
        PetEvent, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='invoices',
        verbose_name="Linked event"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='card')
    
    total_amount = models.DecimalField("Total due", max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField("Tax amount", max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField("Discount", max_digits=12, decimal_places=2, default=0)

    notes = models.TextField("Notes", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField("Payment date", null=True, blank=True)

    def __str__(self):
        name = self.client.get_full_name() if self.client else (self.guest_name or "Anonymous")
        return f"Invoice #{self.id} - {name} ({self.total_amount})"

    def calculate_totals(self):
        items = self.items.all()
        total = sum(item.subtotal for item in items)
        self.total_amount = total - self.discount_amount
        self.save(update_fields=['total_amount'])

    class Meta:
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    item = models.ForeignKey(CatalogItem, on_delete=models.PROTECT, verbose_name="Catalog item")
    
    name_at_moment = models.CharField("Name on invoice", max_length=200)
    price_at_moment = models.DecimalField("Unit price", max_digits=10, decimal_places=2)
    tax_percent_at_moment = models.DecimalField("Tax %", max_digits=5, decimal_places=2, default=0)
    
    quantity = models.IntegerField("Quantity", default=1)
    subtotal = models.DecimalField("Line total", max_digits=12, decimal_places=2)

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
        verbose_name = "Invoice line"
        verbose_name_plural = "Invoice lines"