from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import Pet, PetEvent, EventType, PetAccess, PetEventAttachment

User = get_user_model()


class PetQuerysetIsolationTests(TestCase):
    """I-4: пользователь видит только своих питомцев (owner | access | shadow)."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='pass12345'
        )
        self.vet = User.objects.create_user(
            username='vet', email='vet@example.com', password='pass12345'
        )
        self.stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com', password='pass12345'
        )

        self.own_pet = Pet.objects.create(owner=self.owner, name='Murzik', gender='M')
        self.shadow_pet = Pet.objects.create(
            owner=None, created_by=self.vet, name='Shadow', gender='F',
            temp_owner_name='Ivan', temp_owner_phone='+79111111111',
        )
        self.foreign_pet = Pet.objects.create(owner=self.stranger, name='Rex', gender='M')

        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

        self.client_vet = APIClient()
        self.client_vet.force_authenticate(user=self.vet)

    def test_owner_sees_only_own_pets_and_granted(self):
        """Владелец видит своих, но не чужих питомцев."""
        response = self.client_owner.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Эндпоинт возвращает плоский список (без пагинации)
        items = response.data
        ids = [p['id'] for p in items]
        self.assertIn(self.own_pet.id, ids)
        self.assertNotIn(self.foreign_pet.id, ids)
        self.assertNotIn(self.shadow_pet.id, ids)

    def test_vet_sees_shadow_pets(self):
        """Врач видит теневые карты, которые сам создал."""
        response = self.client_vet.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data
        ids = [p['id'] for p in items]
        self.assertIn(self.shadow_pet.id, ids)

    def test_vet_with_access_sees_shared_pet(self):
        """Врач с активным доступом видит чужого питомца."""
        PetAccess.objects.create(
            pet=self.own_pet, user=self.vet, access_level='read', is_active=True
        )
        response = self.client_vet.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data
        ids = [p['id'] for p in items]
        self.assertIn(self.own_pet.id, ids)


class PetEventIsolationTests(TestCase):
    """I-4: юзер не видит события чужих питомцев."""

    def setUp(self):
        self.owner_a = User.objects.create_user(
            username='owner_a', email='a@example.com', password='pass12345'
        )
        self.owner_b = User.objects.create_user(
            username='owner_b', email='b@example.com', password='pass12345'
        )
        self.event_type = EventType.objects.create(name='Vaccination', slug='vaccination')

        self.pet_a = Pet.objects.create(owner=self.owner_a, name='Pet A', gender='M')
        self.pet_b = Pet.objects.create(owner=self.owner_b, name='Pet B', gender='F')

        self.event_a = PetEvent.objects.create(
            pet=self.pet_a, event_type=self.event_type, title='Vax A', date='2026-01-01T10:00:00Z'
        )
        self.event_b = PetEvent.objects.create(
            pet=self.pet_b, event_type=self.event_type, title='Vax B', date='2026-01-02T10:00:00Z'
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.owner_a)

    def test_user_sees_only_own_events(self):
        response = self.client_a.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data
        ids = [e['id'] for e in items]
        self.assertIn(self.event_a.id, ids)
        self.assertNotIn(self.event_b.id, ids)

    def test_duplicate_creates_planned_copy(self):
        """P-1: POST /api/events/{id}/duplicate/ создаёт planned-копию на next_date."""
        # У события пока нет next_date → копия на date + 30 дней
        response = self.client_a.post(f'/api/events/{self.event_a.id}/duplicate/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)


class PetRecentEventsLimitTests(TestCase):
    """recent_events в PetSerializer должен возвращать не более 5 событий (get_recent_events[:5])."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner_re', email='re@example.com', password='pass12345'
        )
        self.event_type = EventType.objects.create(name='Vaccination', slug='vaccination-re')
        self.pet = Pet.objects.create(owner=self.owner, name='Rex', gender='M')

        for i in range(7):
            PetEvent.objects.create(
                pet=self.pet, event_type=self.event_type,
                title=f'Event {i}', date=f'2026-03-0{i+1}T10:00:00Z',
            )

        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

    def test_recent_events_limited_to_five(self):
        """PetSerializer.recent_events не отдаёт больше 5 событий."""
        response = self.client_owner.get(f'/api/pets/{self.pet.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recent = response.data.get('recent_events', [])
        self.assertLessEqual(len(recent), 5)
        # В ответе не должно быть чужого события (pet__owner фильтрация работает)
        for ev in recent:
            self.assertEqual(ev['pet'], self.pet.id)


class PetAttachmentPermissionTests(TestCase):
    """I-4: вложения: 403 для чужих, доступ владельцу / write-access."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='pass12345'
        )
        self.stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com', password='pass12345'
        )
        self.vet = User.objects.create_user(
            username='vet', email='vet@example.com', password='pass12345'
        )
        self.event_type = EventType.objects.create(name='Checkup', slug='checkup')
        self.pet = Pet.objects.create(owner=self.owner, name='Barsik', gender='M')
        self.event = PetEvent.objects.create(
            pet=self.pet, event_type=self.event_type, title='Check', date='2026-02-01T10:00:00Z'
        )

        self.client_stranger = APIClient()
        self.client_stranger.force_authenticate(user=self.stranger)

        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

        self.client_vet = APIClient()
        self.client_vet.force_authenticate(user=self.vet)

    def test_stranger_cannot_see_attachments(self):
        """Юзер без доступа не видит вложения чужого события."""
        attachment = PetEventAttachment.objects.create(event=self.event, file='event_docs/x.pdf')
        response = self.client_stranger.get('/api/event-attachments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_stranger_cannot_upload_attachment(self):
        """Юзер без доступа получает 403 при попытке attach к чужому событию."""
        # PetEventSerializer требует file + event; используем multipart
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile('test.pdf', b'%PDF-1.4 test', content_type='application/pdf')
        response = self.client_stranger.post(
            '/api/event-attachments/',
            {'event': self.event.id, 'file': f},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_upload_attachment(self):
        """Владелец питомца может прикрепить файл."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        f = SimpleUploadedFile('test.pdf', b'%PDF-1.4 test', content_type='application/pdf')
        response = self.client_owner.post(
            '/api/event-attachments/',
            {'event': self.event.id, 'file': f},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)