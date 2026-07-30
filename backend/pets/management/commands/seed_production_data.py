"""
Management command to seed production-ready demo data:

Users:
  - god / god@gmail.com   — Main admin, veterinarian, owner of the clinic
  - sarah.johnson / sarah@example.com — Sarah Johnson, DVM
  - marcus.chen / marcus@example.com  — Marcus Chen, DVM

Clinic:
  - "Paws & Hearts Veterinary Clinic" — god is admin, sarah & marcus are members

Pets (by god):
  - 5 regular pets (owner=god): Oliver, Luna, Mango, Peanut, Spyro
  - 4 shadow/temp-owner pets: Willow, Max, Monty, Daisy
  - All assigned to the clinic as patients

Access:
  - sarah & marcus get write-level PetAccess to the 4 shadow pets

Events, attributes, tags, and photos are created for all 9 pets.
"""
import requests
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from datetime import timedelta, date
from django.contrib.auth import get_user_model
from pets.models import Pet, PetImage, Category, Tag, Attribute, PetAttribute, EventType, PetEvent, PetAccess
from vetclinics.models import VetClinic, ClinicMember

User = get_user_model()

# ── Unsplash image URLs (royalty-free, stable IDs) ──
SEED_IMAGES = {
    'oliver': 'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=800',
    'luna':   'https://images.unsplash.com/photo-1617895153857-82fe79adfcd4?w=800',
    'mango':  'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800',
    'peanut': 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800',
    'spyro':  'https://images.unsplash.com/photo-1504450874802-0ba2bcd9c5f0?w=800',
    'willow': 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',
    'max':    'https://images.unsplash.com/photo-1553882809-a4f57e59501d?w=800',
    'monty':  'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=800',
    'daisy':  'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800',
}


class Command(BaseCommand):
    help = 'Seed full production demo data: users, clinic, pets, events, access grants & photos'

    # ================================================================
    #  BOOTSTRAP
    # ================================================================

    def _ensure_init_data(self):
        if not Category.objects.exists():
            self.stdout.write("Categories empty → running init_data first...")
            call_command('init_data')
            if not Category.objects.exists():
                raise RuntimeError("init_data didn't create categories, aborting")

    def _cleanup(self):
        """Remove all seed data from previous runs — users, pets, events, clinic."""
        # Remove pets & events created by god
        god = User.objects.filter(username='god').first()
        if god:
            PetEvent.objects.filter(pet__created_by=god).delete()
            PetAttribute.objects.filter(pet__created_by=god).delete()
            Pet.objects.filter(created_by=god).delete()

        # Remove clinic + memberships
        ClinicMember.objects.filter(clinic__name="Paws & Hearts Veterinary Clinic").delete()
        VetClinic.objects.filter(name="Paws & Hearts Veterinary Clinic").delete()

        # Remove extra users (except god)
        User.objects.filter(username__in=['sarah.johnson', 'marcus.chen']).delete()

    # ================================================================
    #  USERS
    # ================================================================

    def _get_or_create_users(self):
        """Create god + 2 vet users. Returns dict of username -> User."""
        # 1) god
        god, created = User.objects.get_or_create(
            username='god',
            defaults={
                'email': 'god@gmail.com',
                'is_staff': True,
                'is_superuser': True,
                'is_veterinarian': True,
                'is_verified': True,
                'first_name': 'God',
                'last_name': 'Admin',
                'clinic_name': 'Paws & Hearts Veterinary Clinic',
            }
        )
        if not created:
            if god.email != 'god@gmail.com':
                god.email = 'god@gmail.com'
            god.is_veterinarian = True
            god.is_verified = True
            god.save(update_fields=['email', 'is_veterinarian', 'is_verified'])
        god.set_password('god')  # simple password for local dev
        god.save(update_fields=['password'])

        # 2) Sarah Johnson
        sarah, _ = User.objects.get_or_create(
            username='sarah.johnson',
            defaults={
                'email': 'sarah@example.com',
                'first_name': 'Sarah',
                'last_name': 'Johnson',
                'is_veterinarian': True,
                'is_verified': True,
                'clinic_name': 'Paws & Hearts Veterinary Clinic',
                'about': 'Small animal medicine & surgery. Special interest in feline behaviour.',
            }
        )
        sarah.set_password('sarah')
        sarah.save(update_fields=['password'])

        # 3) Marcus Chen
        marcus, _ = User.objects.get_or_create(
            username='marcus.chen',
            defaults={
                'email': 'marcus@example.com',
                'first_name': 'Marcus',
                'last_name': 'Chen',
                'is_veterinarian': True,
                'is_verified': True,
                'clinic_name': 'Paws & Hearts Veterinary Clinic',
                'about': 'Exotic animal specialist — reptiles, birds, and pocket pets.',
            }
        )
        marcus.set_password('marcus')
        marcus.save(update_fields=['password'])

        self.stdout.write(f"  Users ready: god ({god.id}), sarah.johnson ({sarah.id}), marcus.chen ({marcus.id})")
        return {'god': god, 'sarah': sarah, 'marcus': marcus}

    # ================================================================
    #  CLINIC
    # ================================================================

    def _get_or_create_clinic(self, users):
        """Create the demo clinic with god as admin, sarah & marcus as members."""
        clinic, created = VetClinic.objects.get_or_create(
            name="Paws & Hearts Veterinary Clinic",
            defaults={
                'address': '742 Evergreen Terrace, Portland, OR 97201, United States',
                'phone': '+1 (503) 555-0199',
                'email': 'hello@pawsandhearts.com',
                'description': 'A full-service veterinary clinic offering wellness exams, vaccinations, surgery, and specialized care for cats, dogs, birds, reptiles, and farm animals.',
                'created_by': users['god'],
            }
        )
        if not created:
            clinic.created_by = users['god']
            clinic.save(update_fields=['created_by'])

        # Assign admin role for god
        ClinicMember.objects.get_or_create(
            clinic=clinic,
            user=users['god'],
            defaults={'role': ClinicMember.Role.ADMIN}
        )
        # Assign member role for sarah
        ClinicMember.objects.get_or_create(
            clinic=clinic,
            user=users['sarah'],
            defaults={'role': ClinicMember.Role.MEMBER}
        )
        # Assign member role for marcus
        ClinicMember.objects.get_or_create(
            clinic=clinic,
            user=users['marcus'],
            defaults={'role': ClinicMember.Role.MEMBER}
        )

        self.stdout.write(f"  Clinic ready: {clinic.name} (id={clinic.id}) – admin: god, members: 2")
        return clinic

    # ================================================================
    #  LOOKUP HELPERS
    # ================================================================

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
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            return ContentFile(resp.content, name=filename)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  ⚠ Could not download {url}: {e}"))
            return None

    # ================================================================
    #  PET BUILDER
    # ================================================================

    def _make_pet(self, name, *, owner=None, created_by=None,
                  gender='', birth_date=None, is_active=True, is_public=False,
                  description='', temp_owner_name=None, temp_owner_phone=None,
                  category_slugs=None, tag_slugs=None, attributes=None,
                  image_key=None, clinic=None):
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
                    'clinic': clinic,
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
                    'clinic': clinic,
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
    #  CREATE PETS
    # ================================================================

    def _create_pets(self, users, clinic):
        """Create 9 pets (5 regular + 4 shadow) attached to the clinic."""

        # ── REGULAR PETS (owner = god) ──

        self._make_pet(
            name='Oliver', owner=users['god'], created_by=users['god'],
            gender='M', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=True, clinic=clinic,
            description='Magnificent Maine Coon with a rich red marble coat. Loves chasing sunbeams and napping in high places.',
            category_slugs=['cats', 'cats-mainecoon'],
            tag_slugs=['neutered', 'vaccinated'],
            attributes={'weight': '8.5', 'chip_number': 'US-456789123',
                        'coat_type': 'Semi-long thick', 'eye_color': 'Green'},
            image_key='oliver'
        )

        self._make_pet(
            name='Luna', owner=users['god'], created_by=users['god'],
            gender='F', birth_date=date.today() - timedelta(days=2*365),
            is_active=True, is_public=True, clinic=clinic,
            description='Energetic Siberian Husky with a striking grey-and-white coat. Loves trail running and howling at sirens.',
            category_slugs=['dogs', 'dogs-husky'],
            tag_slugs=['spayed', 'vaccinated'],
            attributes={'weight': '22', 'height': '58',
                        'activity_level': '8', 'coat_type': 'Double thick'},
            image_key='luna'
        )

        self._make_pet(
            name='Mango', owner=users['god'], created_by=users['god'],
            gender='M', birth_date=date.today() - timedelta(days=365),
            is_active=True, is_public=True, clinic=clinic,
            description='Bright green budgie who knows over 10 words. Extremely social and loves mimicking the microwave beep.',
            category_slugs=['birds', 'birds-budgie'],
            tag_slugs=['vaccinated'],
            attributes={'wing_span': '25', 'ring_number': 'US-2023-001',
                        'activity_level': '7'},
            image_key='mango'
        )

        self._make_pet(
            name='Peanut', owner=users['god'], created_by=users['god'],
            gender='F', birth_date=date.today() - timedelta(days=120),
            is_active=True, is_public=True, clinic=clinic,
            description='Adorable sapphire-colored dwarf hamster. Surprisingly fast and an expert at stuffing her cheeks.',
            category_slugs=['rodents', 'rodents-hamster-djungarian'],
            tag_slugs=[],
            attributes={'weight': '0.045', 'coat_type': 'Fluffy'},
            image_key='peanut'
        )

        self._make_pet(
            name='Spyro', owner=users['god'], created_by=users['god'],
            gender='M', birth_date=date.today() - timedelta(days=2*365),
            is_active=True, is_public=True, clinic=clinic,
            description='Bearded dragon, Hypo Translucent morph. Incredibly calm and enjoys basking under his heat lamp for hours.',
            category_slugs=['reptiles', 'reptiles-bearded-dragon'],
            tag_slugs=[],
            attributes={'morph': 'Hypo Translucent', 'terrarium_type': 'Horizontal',
                        'uv_index': '8', 'weight': '0.45'},
            image_key='spyro'
        )

        # ── SHADOW PETS (owner = None, temp_owner, created_by = god) ──

        self._make_pet(
            name='Willow', created_by=users['god'],
            gender='F', birth_date=date.today() - timedelta(days=4*365),
            is_active=True, is_public=False, clinic=clinic,
            temp_owner_name='Emma Johnson', temp_owner_phone='+1 (415) 555-0101',
            description='British Shorthair with a plush blue-grey coat. A true lap cat who spends most of her day lounging on the sofa.',
            category_slugs=['cats', 'cats-british'],
            tag_slugs=['spayed', 'vaccinated'],
            attributes={'weight': '5.2', 'coat_type': 'Short plush',
                        'eye_color': 'Amber'},
            image_key='willow'
        )

        self._make_pet(
            name='Max', created_by=users['god'],
            gender='M', birth_date=date.today() - timedelta(days=5*365),
            is_active=True, is_public=False, clinic=clinic,
            temp_owner_name='James Wilson', temp_owner_phone='+1 (312) 555-0142',
            description='Loyal German Shepherd with a classic saddle-tan coat. Excellent guard dog and devoted family companion.',
            category_slugs=['dogs', 'dogs-germanshepherd'],
            tag_slugs=['vaccinated'],
            attributes={'weight': '38', 'height': '63',
                        'activity_level': '7', 'bite_type': 'Scissors'},
            image_key='max'
        )

        self._make_pet(
            name='Monty', created_by=users['god'],
            gender='M', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=False, clinic=clinic,
            temp_owner_name='Michael Brown', temp_owner_phone='+1 (212) 555-0167',
            description='Ball python, Normal/Classic morph. Docile temperament and a strong feeding response.',
            category_slugs=['reptiles', 'reptiles-ball-python'],
            tag_slugs=['hibernation'],
            attributes={'weight': '1.8', 'morph': 'Normal Classic',
                        'terrarium_type': 'Horizontal'},
            image_key='monty'
        )

        self._make_pet(
            name='Daisy', created_by=users['god'],
            gender='F', birth_date=date.today() - timedelta(days=3*365),
            is_active=True, is_public=False, clinic=clinic,
            temp_owner_name='Green Valley Farms Ltd', temp_owner_phone='+1 (559) 555-0123',
            description='Holstein cow with classic black-and-white markings. Consistently high milk yield with excellent butterfat content.',
            category_slugs=['cattle', 'cattle-holstein'],
            tag_slugs=['vaccinated', 'milking'],
            attributes={'weight': '650', 'milk_yield': '25',
                        'fat_content': '3.8', 'tag_number': 'US-1234'},
            image_key='daisy'
        )

        # Collect all pets by name
        all_pets = list(Pet.objects.filter(created_by=users['god']).order_by('pk'))
        self.stdout.write(f"  Created {len(all_pets)} pets (god as creator)")
        return {p.name: p for p in all_pets}

    # ================================================================
    #  EVENTS
    # ================================================================

    def _create_events(self, pets, users):
        """Attach medical/checkup events to all 9 pets."""
        def ev(pet, *args, **kwargs):
            return self._make_event(pet, *args, created_by=users['god'], **kwargs)

        # Oliver
        if 'Oliver' in pets:
            ev(pets['Oliver'], 'vaccine', 'Vaccination Nobivac TriCat', 180,
               data={'drug_name': 'Nobivac TriCat', 'batch': 'A123'})
            ev(pets['Oliver'], 'checkup', 'Routine wellness exam', 90)
            ev(pets['Oliver'], 'parasite', 'Deworming Stronghold', 30,
               data={'drug_name': 'Stronghold for cats'})

        # Luna
        if 'Luna' in pets:
            ev(pets['Luna'], 'vaccine', 'Vaccination Nobivac DHPPi', 240,
               data={'drug_name': 'Nobivac DHPPi', 'batch': 'B456'})
            ev(pets['Luna'], 'checkup', 'Post-vaccination follow-up', 60)
            ev(pets['Luna'], 'parasite', 'Deworming Advocate', 14,
               data={'drug_name': 'Advocate for dogs'})
            ev(pets['Luna'], 'estrus', 'First heat cycle', 30)

        # Mango
        if 'Mango' in pets:
            ev(pets['Mango'], 'vaccine', 'Vaccination against ornithosis', 90)
            ev(pets['Mango'], 'checkup', 'Annual preventive checkup', 30)

        # Peanut
        if 'Peanut' in pets:
            ev(pets['Peanut'], 'checkup', 'Juvenile wellness check', 60)

        # Spyro
        if 'Spyro' in pets:
            ev(pets['Spyro'], 'checkup', 'Reptile wellness exam', 30)
            ev(pets['Spyro'], 'molting', 'Full body shed', 14, data={'quality': True})

        # Willow (shadow)
        if 'Willow' in pets:
            ev(pets['Willow'], 'vaccine', 'Vaccination Feligen CRP', 365,
               data={'drug_name': 'Feligen CRP', 'batch': 'C789'})
            ev(pets['Willow'], 'checkup', 'Annual comprehensive exam', 180)

        # Max (shadow)
        if 'Max' in pets:
            ev(pets['Max'], 'vaccine', 'Vaccination Nobivac Rabies', 300,
               data={'drug_name': 'Nobivac Rabies', 'batch': 'D012'})
            ev(pets['Max'], 'checkup', 'General physical exam', 120)

        # Monty (shadow)
        if 'Monty' in pets:
            ev(pets['Monty'], 'checkup', 'Reptile wellness check', 60)
            ev(pets['Monty'], 'molting', 'Full clean shed', 30, data={'quality': True})

        # Daisy (shadow)
        if 'Daisy' in pets:
            ev(pets['Daisy'], 'vaccine', 'Cattle herd vaccination', 30)
            ev(pets['Daisy'], 'checkup', 'Routine herd check', 14)
            ev(pets['Daisy'], 'milking_test', 'Monthly control milking', 7,
               data={'volume': 25, 'fat': 3.8})

        event_count = PetEvent.objects.filter(pet__created_by=users['god']).count()
        self.stdout.write(f"  Created {event_count} events")

    # ================================================================
    #  ACCESS GRANTS
    # ================================================================

    def _grant_access(self, pets, users):
        """
        Grant write-level PetAccess to Sarah and Marcus for the 4 shadow pets.
        This lets them see and manage Willow, Max, Monty & Daisy in their dashboard.
        """
        shadow_names = ['Willow', 'Max', 'Monty', 'Daisy']
        grants_created = 0
        for name in shadow_names:
            pet = pets.get(name)
            if not pet:
                continue
            for vet_key in ['sarah', 'marcus']:
                vet = users[vet_key]
                _, created = PetAccess.objects.update_or_create(
                    pet=pet,
                    user=vet,
                    defaults={
                        'access_level': 'write',
                        'is_active': True,
                    }
                )
                if created:
                    grants_created += 1

        self.stdout.write(f"  Granted {grants_created} PetAccess grants (shadow pets → sarah & marcus)")

    # ================================================================
    #  HANDLE
    # ================================================================

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("══ SEED PRODUCTION DATA ══")

        self._ensure_init_data()

        # 1. Clean previous seed data
        self._cleanup()
        self.stdout.write("  Cleaned up previous seed data")

        # 2. Create / fetch users
        users = self._get_or_create_users()

        # 3. Create clinic + memberships
        clinic = self._get_or_create_clinic(users)

        # 4. Create 9 pets (5 regular + 4 shadow) with clinic FK
        pets = self._create_pets(users, clinic)

        # 5. Create events
        self._create_events(pets, users)

        # 6. Grant PetAccess for shadow pets
        self._grant_access(pets, users)

        # ── Summary ──
        regular_count = Pet.objects.filter(owner=users['god'], created_by=users['god']).count()
        shadow_count = Pet.objects.filter(owner__isnull=True, created_by=users['god']).count()
        event_count = PetEvent.objects.filter(pet__created_by=users['god']).count()
        image_count = PetImage.objects.filter(pet__created_by=users['god']).count()
        member_count = ClinicMember.objects.filter(clinic=clinic).count()
        access_count = PetAccess.objects.filter(pet__created_by=users['god'], is_active=True).count()

        self.stdout.write(self.style.SUCCESS(
            f"✅ Done — {regular_count} regular + {shadow_count} shadow pets | "
            f"{event_count} events | {image_count} photos | "
            f"{member_count} clinic members | {access_count} access grants"
        ))