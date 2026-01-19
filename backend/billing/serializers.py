from rest_framework import serializers
from .models import CatalogItem, Invoice, InvoiceItem, EventTemplate, TemplateItem
from users.serializers import PublicProfileSerializer
from pets.serializers import PetSerializer

# === CATALOG ===
class CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = ['id', 'name', 'code', 'item_type', 'price', 'tax_percent', 'stock_quantity', 'description', 'is_active', 'created_by']
        read_only_fields = ['created_by']

# === TEMPLATES (MACROS) ===
class TemplateItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(queryset=CatalogItem.objects.all(), source='item')
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.DecimalField(source='item.price', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = TemplateItem
        fields = ['item_id', 'item_name', 'item_price', 'quantity']

class EventTemplateSerializer(serializers.ModelSerializer):
    items = TemplateItemSerializer(many=True)

    class Meta:
        model = EventTemplate
        fields = ['id', 'name', 'description_template', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        template = EventTemplate.objects.create(**validated_data)
        for item_data in items_data:
            TemplateItem.objects.create(template=template, **item_data)
        return template

# === INVOICES ===
class InvoiceItemSerializer(serializers.ModelSerializer):
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=CatalogItem.objects.all(), 
        source='item', 
        write_only=True
    )
    name_at_moment = serializers.CharField(read_only=True)
    price_at_moment = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'item_id', 'quantity', 'name_at_moment', 'price_at_moment', 'subtotal']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    client_info = serializers.SerializerMethodField()
    pet_name = serializers.CharField(source='pet.name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'status', 'payment_method', 
            'total_amount', 'tax_amount', 'discount_amount',
            'client', 'client_info', 'guest_name',
            'pet', 'pet_name', 'event',
            'items', 'created_at', 'notes'
        ]
        read_only_fields = ['total_amount', 'tax_amount', 'created_at']

    def get_client_info(self, obj):
        # 1. Если клиент явно привязан к счету (Зарегистрированный User)
        if obj.client:
            return {
                "id": obj.client.id,
                "name": obj.client.get_full_name() or obj.client.email,
                "is_shadow": False
            }
        
        # 2. Если есть питомец
        if obj.pet:
            # 2.1 У питомца есть реальный владелец (User)
            if obj.pet.owner:
                return {
                    "id": obj.pet.owner.id,
                    "name": obj.pet.owner.get_full_name() or obj.pet.owner.email,
                    "is_shadow": False
                }
            
            # 2.2 [FIX] У питомца есть Теневой владелец (Shadow Card)
            if obj.pet.temp_owner_name:
                return {
                    "id": None,
                    "name": obj.pet.temp_owner_name, # Например: "Иван (Временный)"
                    "is_shadow": True
                }
            
        # 3. Иначе - Гость / Аноним
        return {
            "name": obj.guest_name or "Гость",
            "is_shadow": True
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        invoice.calculate_totals()
        return invoice

    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.payment_method = validated_data.get('payment_method', instance.payment_method)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()
        return instance