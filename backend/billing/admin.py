from django.contrib import admin
from .models import CatalogItem, Invoice, InvoiceItem, EventTemplate, TemplateItem

@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'item_type', 'price', 'created_by')
    list_filter = ('item_type', 'is_active')
    search_fields = ('name', 'code')

class TemplateItemInline(admin.TabularInline):
    model = TemplateItem
    extra = 1

@admin.register(EventTemplate)
class EventTemplateAdmin(admin.ModelAdmin):
    inlines = [TemplateItemInline]
    list_display = ('name', 'created_by')

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1
    readonly_fields = ('subtotal', 'name_at_moment', 'price_at_moment')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'total_amount', 'created_at')
    inlines = [InvoiceItemInline]