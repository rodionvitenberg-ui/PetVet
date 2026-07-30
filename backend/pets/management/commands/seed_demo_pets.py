import os
import io
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import requests
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from datetime import timedelta, date
from django.contrib.auth import get_user_model
from pets.models import Pet, PetImage, Category, Tag, Attribute, PetAttribute, EventType, PetEvent

User = get_user_model()

# ── Unsplash image URLs (royalty-free, stable IDs) ──
SEED_IMAGES = {
    'oliver': 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=800',   # Maine Coon / orange cat
    'luna':   'https://images.unsplash.com/photo-1617895153857-82fe79adfcd4?w=800',   # Husky
    'mango':  'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800',   # Budgie
    'peanut': 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800',   # Hamster
    'spyro':  'https://images.unsplash.com/photo-1504450874802-0ba2bcd9c5f0?w=800',   # Bearded dragon
    'willow': 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',   # British Shorthair / grey cat
    'max':    'https://images.unsplash.com/photo-1553882809-a4f57e59501d?w=800',   # German Shepherd
    'monty':  'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=800',   # Ball python
    'daisy':  'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800',   # Holstein cow
}


class Command(BaseCommand):
    help = 'Seed demo data: 5 regular pets (owner=god) + 4 shadow pets (temp owner) with attributes, events & photos'

    def _ensure_init_data(self):
        if not Category.objects.exists():
            self.stdout.write("Categories empty → running init_data first...")
            call_command('init_data')
            if not Category.objects.exists():
                raise RuntimeError("init_data didn't create categories, aborting")

    def _get_user_god(self):
        user, created = User.objects.get_or_create(
            username='god',
            defaults={
                'email': 'god@gmail.com',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if not created and user.email != 'god@gmail.com':
            user.email = 'god@gmail.com'
            user.save(update_fields=['email'])
        return user

    def _cleanup(self, god):
        """Remove all pets & events created by previous runs of this seed"""
        PetEvent.objects.filter(pet__created_by=god).delete()
        PetAttribute.objects.filter(pet__created_by=god).delete()
        # PetImage is cascade-deleted with Pet
        Pet.objects.filter(created_by=god).delete()

    # ── Lookup helpers ──

    def _cat(self, slug):
        try:
            return Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"  ⚠ Category '{slug}' not found"))
            return None

    def _tag(self, slug):
        try:
            return Tag.objects.get(slug=slug)
        except Tag.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"  ⚠ Tag '{slug}' not found"))
            return None

    def _attr(self, slug):
        try:
            return Attribute.objects.get(slug=slug)
        except Attribute.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"  ⚠ Attribute '{slug}' not found"))
            return None

    def _event_type(self, slug):
        try:
            return EventType.objects.get(slug=slug)
        except EventType.DoesNotExist:
            self.stdout.write(self.style.WARNING(f"  ⚠ EventType '{slug}' not found"))
            return None

    def _download_image(self, url, filename):
        """
        Download an image from `url` and return a Django ContentFile,
        or None if the download fails.
        """
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            return ContentFile(resp.content, name=filename)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  ⚠ Could not download {url}: {e}"))
            return None

    def _make_pet(self, name, *, owner=None, created_by=None,
                  gender='', birth_date=None, is_active=True, is_public=False,
                  description='', temp_owner_name=None, temp_owner_phone=None,
                  category_slugs=None, tag_slugs=None, attributes=None,
                  image_key=None):
        """
        Create or update a pet. If `image_key` is provided and the pet
        has no images yet, download the matching Unsplash photo.
        """
        if temp_owner_name:
            pet, _ = Pet.objects.update_or_create(
                name=name,
                owner=None,
                temp_owner_name=temp_owner_name,
                defaults={
                    'gender': gender,
                    'birth_date': birth_date,
                    'is_active': is_active,
                    'is_public': is_public,
                    'description': description,
                    'temp_owner_phone': temp_owner_phone,
                    'created_by': created_by,
                }
            )
        else:
            pet, _ = Pet.objects.update_or_create(
                name=name,
                owner=owner,
                defaults={
                    'gender': gender,
                    'birth_date': birth_date,
                    'is_active': is_active,
                    'is_public': is_public,
                    'description': description,
                    'created_by': created_by,
                }
            )

        if category_slugs:
            cats = [self._cat(s) for s in category_slugs if self._cat(s)]
            if cats:
                pet.categories.set(cats)

        if tag_slugs:
            tags = [self._tag(s) for s in tag_slugs if self._tag(s)]
            if tags:
                pet.tags.set(tags)

        if attributes:
            for attr_slug, value in attributes.items():
                attr = self._attr(attr_slug)
                if attr:
                    PetAttribute.objects.update_or_create(
                        pet=pet,
                        attribute=attr,
                        defaults={'value': str(value)}
                    )

        # ── Attach seed photo (only if pet has no images yet) ──
        if image_key and image_key in SEED_IMAGES and not pet.images.exists():
            img_file = self._download_image(
                SEED_IMAGES[image_key],
                filename=f'{image_key}.jpg'
            )
            if img_file:
                PetImage.objects.create(
                    pet=pet,
                    image=img_file,
                    is_main=True
                )

        return pet

    def _make_event(self, pet, event_type_slug, title,
                    days_ago, status='completed',
                    description='', data=None, created_by=None):
        et = self._event_type(event_type_slug)
        if not et:
            return None
        dt = timezone.now() - timedelta(days=days_ago)
        return PetEvent.objects.create(
            pet=pet,
            event_type=et,
            title=title,
            description=description,
            date=dt,
            status=status,
            data=data or {},
            created_by=created_by,
        )

    # ================================================================
    #  HANDLE
    # ================================================================

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("── SEED DEMO PETS ──")

        self._ensure_init_data()
        god = self._get_user_god()

        # Remove any previous seed data
        self._cleanup(god)
        self.stdout.write("  Cleaned up previous seed data")

        # ── REGULAR PETS (owner = god) ──

        # 1. Oliver — Maine Coon cat
        self._make_pet(
            name='Oliver', owner=god, created_by=god,
            gender='M', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=True,
            description='Magnificent Maine Coon with a rich red marble coat. Loves chasing sunbeams and napping in high places.',
            category_slugs=['cats', 'cats-mainecoon'],
            tag_slugs=['neutered', 'vaccinated'],
            attributes={'weight': '8.5', 'chip_number': 'US-456789123',
                        'coat_type': 'Semi-long thick', 'eye_color': 'Green'},
            image_key='oliver'
        )

        # 2. Luna — Siberian Husky
        self._make_pet(
            name='Luna', owner=god, created_by=god,
            gender='F', birth_date=date.today() - timedelta(days=2*365),
            is_active=True, is_public=True,
            description='Energetic Siberian Husky with a striking grey-and-white coat. Loves trail running and howling at sirens.',
            category_slugs=['dogs', 'dogs-husky'],
            tag_slugs=['spayed', 'vaccinated'],
            attributes={'weight': '22', 'height': '58',
                        'activity_level': '8', 'coat_type': 'Double thick'},
            image_key='luna'
        )

        # 3. Mango — Budgie
        self._make_pet(
            name='Mango', owner=god, created_by=god,
            gender='M', birth_date=date.today() - timedelta(days=365),
            is_active=True, is_public=True,
            description='Bright green budgie who knows over 10 words. Extremely social and loves mimicking the microwave beep.',
            category_slugs=['birds', 'birds-budgie'],
            tag_slugs=['vaccinated'],
            attributes={'wing_span': '25', 'ring_number': 'US-2023-001',
                        'activity_level': '7'},
            image_key='mango'
        )

        # 4. Peanut — Djungarian hamster
        self._make_pet(
            name='Peanut', owner=god, created_by=god,
            gender='F', birth_date=date.today() - timedelta(days=120),
            is_active=True, is_public=True,
            description='Adorable sapphire-colored dwarf hamster. Surprisingly fast and an expert at stuffing her cheeks.',
            category_slugs=['rodents', 'rodents-hamster-djungarian'],
            tag_slugs=[],
            attributes={'weight': '0.045', 'coat_type': 'Fluffy'},
            image_key='peanut'
        )

        # 5. Spyro — Bearded dragon
        self._make_pet(
            name='Spyro', owner=god, created_by=god,
            gender='M', birth_date=date.today() - timedelta(days=2*365),
            is_active=True, is_public=True,
            description='Bearded dragon, Hypo Translucent morph. Incredibly calm and enjoys basking under his heat lamp for hours.',
            category_slugs=['reptiles', 'reptiles-bearded-dragon'],
            tag_slugs=[],
            attributes={'morph': 'Hypo Translucent', 'terrarium_type': 'Horizontal',
                        'uv_index': '8', 'weight': '0.45'},
            image_key='spyro'
        )

        # ── SHADOW PETS (owner = None, temp_owner, created_by = god) ──

        # 6. Willow — British Shorthair cat
        self._make_pet(
            name='Willow', created_by=god,
            gender='F', birth_date=date.today() - timedelta(days=4*365),
            is_active=True, is_public=False,
            temp_owner_name='Emma Johnson', temp_owner_phone='+1 (415) 555-0101',
            description='British Shorthair with a plush blue-grey coat. A true lap cat who spends most of her day lounging on the sofa.',
            category_slugs=['cats', 'cats-british'],
            tag_slugs=['spayed', 'vaccinated'],
            attributes={'weight': '5.2', 'coat_type': 'Short plush',
                        'eye_color': 'Amber'},
            image_key='willow'
        )

        # 7. Max — German Shepherd
        self._make_pet(
            name='Max', created_by=god,
            gender='M', birth_date=date.today() - timedelta(days=5*365),
            is_active=True, is_public=False,
            temp_owner_name='James Wilson', temp_owner_phone='+1 (312) 555-0142',
            description='Loyal German Shepherd with a classic saddle-tan coat. Excellent guard dog and devoted family companion.',
            category_slugs=['dogs', 'dogs-germanshepherd'],
            tag_slugs=['vaccinated'],
            attributes={'weight': '38', 'height': '63',
                        'activity_level': '7', 'bite_type': 'Scissors'},
            image_key='max'
        )

        # 8. Monty — Ball Python
        self._make_pet(
            name='Monty', created_by=god,
            gender='M', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=False,
            temp_owner_name='Michael Brown', temp_owner_phone='+1 (212) 555-0167',
            description='Ball python, Normal/Classic morph. Docile temperament and a strong feeding response.',
            category_slugs=['reptiles', 'reptiles-ball-python'],
            tag_slugs=['hibernation'],
            attributes={'weight': '1.8', 'morph': 'Normal Classic',
                        'terrarium_type': 'Horizontal'},
            image_key='monty'
        )

        # 9. Daisy — Holstein cattle
        self._make_pet(
            name='Daisy', created_by=god,
            gender='F', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=False,
            temp_owner_name='Green Valley Farms Ltd', temp_owner_phone='+1 (559) 555-0123',
            description='Holstein cow with classic black-and-white markings. Consistently high milk yield with excellent butterfat content.',
            category_slugs=['cattle', 'cattle-holstein'],
            tag_slugs=['vaccinated', 'milking'],
            attributes={'weight': '650', 'milk_yield': '25',
                        'fat_content': '3.8', 'tag_number': 'US-1234'},
            image_key='daisy'
        )

        # ── EVENTS ──
        # Fetch all pets back by created_by=god to attach events
        all_pets = list(Pet.objects.filter(created_by=god).order_by('pk'))
        if len(all_pets) != 9:
            self.stdout.write(self.style.WARNING(
                f"  Expected 9 pets, got {len(all_pets)}. Events may be incomplete."
            ))

        idx = {p.name: p for p in all_pets}

        def ev(pet, *args, **kwargs):
            self._make_event(pet, *args, created_by=god, **kwargs)

        # Oliver (Maine Coon)
        oliver = idx.get('Oliver')
        if oliver:
            ev(oliver, 'vaccine', 'Vaccination Nobivac TriCat', 180,
               data={'drug_name': 'Nobivac TriCat', 'batch': 'A123'})
            ev(oliver, 'checkup', 'Routine wellness exam', 90)
            ev(oliver, 'parasite', 'Deworming Stronghold', 30,
               data={'drug_name': 'Stronghold for cats'})

        # Luna (Husky)
        luna = idx.get('Luna')
        if luna:
            ev(luna, 'vaccine', 'Vaccination Nobivac DHPPi', 240,
               data={'drug_name': 'Nobivac DHPPi', 'batch': 'B456'})
            ev(luna, 'checkup', 'Post-vaccination follow-up', 60)
            ev(luna, 'parasite', 'Deworming Advocate', 14,
               data={'drug_name': 'Advocate for dogs'})
            ev(luna, 'estrus', 'First heat cycle', 30)

        # Mango (Budgie)
        mango = idx.get('Mango')
        if mango:
            ev(mango, 'vaccine', 'Vaccination against ornithosis', 90)
            ev(mango, 'checkup', 'Annual preventive checkup', 30)

        # Peanut (Hamster)
        peanut = idx.get('Peanut')
        if peanut:
            ev(peanut, 'checkup', 'Juvenile wellness check', 60)

        # Spyro (Bearded Dragon)
        spyro = idx.get('Spyro')
        if spyro:
            ev(spyro, 'checkup', 'Reptile wellness exam', 30)
            ev(spyro, 'molting', 'Full body shed', 14, data={'quality': True})

        # Willow (British Shorthair)
        willow = idx.get('Willow')
        if willow:
            ev(willow, 'vaccine', 'Vaccination Feligen CRP', 365,
               data={'drug_name': 'Feligen CRP', 'batch': 'C789'})
            ev(willow, 'checkup', 'Annual comprehensive exam', 180)

        # Max (German Shepherd)
        max_dog = idx.get('Max')
        if max_dog:
            ev(max_dog, 'vaccine', 'Vaccination Nobivac Rabies', 300,
               data={'drug_name': 'Nobivac Rabies', 'batch': 'D012'})
            ev(max_dog, 'checkup', 'General physical exam', 120)

        # Monty (Ball Python)
        monty = idx.get('Monty')
        if monty:
            ev(monty, 'checkup', 'Reptile wellness check', 60)
            ev(monty, 'molting', 'Full clean shed', 30, data={'quality': True})

        # Daisy (Holstein)
        daisy = idx.get('Daisy')
        if daisy:
            ev(daisy, 'vaccine', 'Cattle herd vaccination', 30)
            ev(daisy, 'checkup', 'Routine herd check', 14)
            ev(daisy, 'milking_test', 'Monthly control milking', 7,
               data={'volume': 25, 'fat': 3.8})

        # Final summary
        regular_count = Pet.objects.filter(owner=god, created_by=god).count()
        shadow_count = Pet.objects.filter(owner__isnull=True, created_by=god).count()
        event_count = PetEvent.objects.filter(pet__in=all_pets).count()
        image_count = PetImage.objects.filter(pet__in=all_pets).count()

        self.stdout.write(self.style.SUCCESS(
            f"✅ Done — {regular_count} regular + {shadow_count} shadow pets, "
            f"{event_count} events, {image_count} photos"
        ))