from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import HeatCycle, Mating, Litter
from .serializers import HeatCycleSerializer, MatingSerializer, LitterSerializer
from pets.models import Pet

class BreedingPermission(permissions.BasePermission):
    """
    Доступ только к своим записям.
    """
    def has_object_permission(self, request, view, obj):
        # Для HeatCycle и Mating проверяем владельца питомца
        if isinstance(obj, HeatCycle):
            return obj.pet.owner == request.user
        if isinstance(obj, Mating):
            return obj.dam.owner == request.user
        if isinstance(obj, Litter):
            return obj.owner == request.user
        return False

class HeatCycleViewSet(viewsets.ModelViewSet):
    serializer_class = HeatCycleSerializer
    permission_classes = [permissions.IsAuthenticated, BreedingPermission]

    def get_queryset(self):
        return HeatCycle.objects.filter(pet__owner=self.request.user)

class MatingViewSet(viewsets.ModelViewSet):
    serializer_class = MatingSerializer
    permission_classes = [permissions.IsAuthenticated, BreedingPermission]

    def get_queryset(self):
        return Mating.objects.filter(dam__owner=self.request.user)

class LitterViewSet(viewsets.ModelViewSet):
    serializer_class = LitterSerializer
    permission_classes = [permissions.IsAuthenticated, BreedingPermission]

    def get_queryset(self):
        return Litter.objects.filter(owner=self.request.user)

    # === KILLER FEATURE: АВТО-ГЕНЕРАЦИЯ ЩЕНКОВ ===
    @action(detail=True, methods=['post'])
    def generate_offspring(self, request, pk=None):
        """
        Создает карточки Pet для всего помета автоматически.
        POST /api/breeding/litters/{id}/generate_offspring/
        Body: { "prefix": "Puppy" } -> Creates "Puppy 1", "Puppy 2"...
        """
        litter = self.get_object()
        
        if litter.offspring.exists():
             return Response({"error": "Карточки для этого помета уже созданы"}, status=400)
             
        count = litter.born_alive
        if count <= 0:
            return Response({"error": "Некого создавать (0 живых)"}, status=400)

        prefix = request.data.get('prefix', f"{litter.litter_code} Baby")
        
        created_pets = []
        for i in range(1, count + 1):
            # Создаем питомца
            new_pet = Pet.objects.create(
                owner=request.user,
                name=f"{prefix} #{i}",
                gender='M', # По умолчанию, потом поменяют
                birth_date=litter.birth_date,
                mother=litter.dam,
                father=litter.sire,
                description=f"Из помета {litter.litter_code}"
            )
            
            # Наследуем породу от матери (упрощенно)
            # Если нужно, можно скопировать категории родителей
            new_pet.categories.set(litter.dam.categories.all())
            
            litter.offspring.add(new_pet)
            created_pets.append(new_pet.id)

        return Response({
            "message": f"Успешно создано {count} карточек.",
            "pet_ids": created_pets
        })