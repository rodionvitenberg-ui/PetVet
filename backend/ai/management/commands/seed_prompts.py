from django.core.management.base import BaseCommand, CommandError
from ai.models import SystemPrompt


DEFAULT_PROMPT = """You are a veterinary AI assistant named PetVet AI.

Your role is to help pet owners understand their pet's health, behaviour, and care needs. You have access to the pet's medical profile.

Guidelines:
- Be compassionate, professional, and clear.
- Base your advice on the provided pet context ({pet_context}) and general veterinary knowledge.
- If the information is insufficient, say so and suggest what a vet would need to know.
- Never prescribe medication — always recommend consulting a veterinarian for treatment decisions.
- Identify urgency when appropriate: routine / needs monitoring / see a vet soon / emergency.
- Use simple language. Avoid medical jargon unless you explain it.
- Answer in the same language the user asks in.

You are NOT a replacement for a veterinarian. Always remind users to consult a professional for serious concerns."""


class Command(BaseCommand):
    help = (
        'Seed the default SystemPrompt and make sure exactly one prompt is marked '
        'as default. Without a default prompt, POST /api/ai/sessions/ returns 400.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Create the default prompt even if other prompts already exist.',
        )
        parser.add_argument(
            '--ensure-default',
            action='store_true',
            help='Ensure exactly one prompt is marked as default (no-op if already true).',
        )

    def handle(self, *args, **options):
        force = options['force']
        ensure_default = options['ensure_default']

        # 1) Create the default prompt if none exists
        if not SystemPrompt.objects.exists() or force:
            created, was_created = SystemPrompt.objects.get_or_create(
                name='Default Vet Assistant',
                defaults={'content': DEFAULT_PROMPT, 'is_default': True},
            )
            if was_created:
                self.stdout.write(self.style.SUCCESS(f'Created default prompt: {created.name}'))
            elif force:
                self.stdout.write(self.style.WARNING('Default prompt already exists.'))
        else:
            self.stdout.write(self.style.WARNING('SystemPrompts already exist. Skipping seed.'))

        # 2) Make sure exactly one prompt is marked is_default
        if ensure_default:
            default = SystemPrompt.objects.filter(is_default=True).first()
            if default is None:
                # No default: pick the most recently updated prompt and set it default
                candidate = SystemPrompt.objects.order_by('-updated_at').first()
                if candidate is None:
                    raise CommandError('No SystemPrompt exists. Run seed_prompts without --ensure-default first.')
                candidate.is_default = True
                candidate.save(update_fields=['is_default'])
                # Model.save() unsets default on all other prompts automatically
                self.stdout.write(self.style.SUCCESS(
                    f'Marked prompt "{candidate.name}" as default (no default existed).'
                ))
            else:
                # Model.save() of a default prompt unsets others, but to be safe
                # with multiple defaults set via raw SQL, unset all other defaults.
                SystemPrompt.objects.filter(is_default=True).exclude(pk=default.pk).update(is_default=False)
                self.stdout.write(self.style.SUCCESS(
                    f'Prompt "{default.name}" is the default.'
                ))