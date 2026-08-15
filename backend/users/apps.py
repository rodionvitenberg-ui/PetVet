from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'

    def ready(self):
        # [P0-6] Подключаем сигналы: approve VetVerificationRequest →
        # is_verified=True / is_veterinarian=True (см. users/signals.py)
        import users.signals  # noqa: F401