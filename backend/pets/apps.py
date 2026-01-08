from django.apps import AppConfig

class PetsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pets' # Убедись, что имя совпадает с твоим проектом (например, 'core' или 'pets')

    def ready(self):
        import pets.signals # <-- ВАЖНО: Импорт сигналов