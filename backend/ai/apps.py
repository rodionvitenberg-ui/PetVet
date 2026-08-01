import logging

from django.apps import AppConfig
from django.db import connection
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)


class AiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai'
    verbose_name = "AI Assistant (DeepSeek)"

    def ready(self):
        """
        Auto-seed the default SystemPrompt after migrations are applied.
        Without a default prompt, POST /api/ai/sessions/ returns 400
        ("No SystemPrompt configured"), so we make sure one always exists.

        post_migrate fires on every `manage.py migrate` run — the standard
        deploy step after `git pull` — even when there are no new migrations.
        """
        post_migrate.connect(self.seed_default_prompt, sender=self)

    def seed_default_prompt(self, **kwargs):
        from django.core.management import call_command

        try:
            tables = connection.introspection.table_names()
            if 'ai_systemprompt' in tables:
                call_command('seed_prompts', '--ensure-default', verbosity=0)
        except Exception:
            logger.warning(
                "seed_prompts skipped (DB not ready or tables missing). "
                "It will be created on next start or via `python manage.py seed_prompts --ensure-default`."
            )