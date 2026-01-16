from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import HeatCycleViewSet, MatingViewSet, LitterViewSet

router = DefaultRouter()
router.register(r'cycles', HeatCycleViewSet, basename='heat-cycle')
router.register(r'matings', MatingViewSet, basename='mating')
router.register(r'litters', LitterViewSet, basename='litter')

urlpatterns = [
    path('', include(router.urls)),
]