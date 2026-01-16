from rest_framework import serializers
from .models import HeatCycle, Mating, Litter
from pets.models import Pet
from pets.serializers import PetSerializer

class HeatCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeatCycle
        fields = '__all__'

class MatingSerializer(serializers.ModelSerializer):
    dam_name = serializers.ReadOnlyField(source='dam.name')
    sire_name = serializers.ReadOnlyField(source='sire.name')

    class Meta:
        model = Mating
        fields = ['id', 'dam', 'dam_name', 'sire', 'sire_name', 'date', 'is_successful', 'cycle']

class LitterSerializer(serializers.ModelSerializer):
    dam_name = serializers.ReadOnlyField(source='dam.name')
    sire_name = serializers.ReadOnlyField(source='sire.name')
    
    # Показываем список детей (кратко)
    offspring_info = serializers.SerializerMethodField()

    class Meta:
        model = Litter
        fields = [
            'id', 'litter_code', 'birth_date', 
            'dam', 'dam_name', 
            'sire', 'sire_name', 
            'born_alive', 'born_dead', 
            'offspring', 'offspring_info'
        ]
        read_only_fields = ['owner']

    def get_offspring_info(self, obj):
        # Возвращаем ID и Имена детей для списка
        return [{"id": p.id, "name": p.name, "slug": p.slug} for p in obj.offspring.all()]

    def create(self, validated_data):
        # Автоматически ставим владельца
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)