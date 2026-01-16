from django.contrib import admin
from .models import HeatCycle, Mating, Litter

@admin.register(HeatCycle)
class HeatCycleAdmin(admin.ModelAdmin):
    list_display = ('pet', 'start_date', 'end_date')
    list_filter = ('start_date',)
    search_fields = ('pet__name',)

@admin.register(Mating)
class MatingAdmin(admin.ModelAdmin):
    list_display = ('dam', 'sire', 'date', 'is_successful')
    list_filter = ('is_successful', 'date')

@admin.register(Litter)
class LitterAdmin(admin.ModelAdmin):
    list_display = ('litter_code', 'owner', 'dam', 'birth_date', 'born_alive')
    search_fields = ('litter_code', 'owner__username')
    filter_horizontal = ('offspring',)