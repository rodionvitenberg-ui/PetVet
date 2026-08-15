from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import VetVerificationRequest

User = get_user_model()


class UserRoleNotSelfServiceTests(TestCase):
    """I-4 + P0-6: PATCH role=vet не меняет is_veterinarian."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='owner', email='owner@example.com', password='pass12345',
            is_veterinarian=False,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_patch_role_vet_does_not_change_role(self):
        """Отправка role='vet' в PATCH /me не делает юзера врачом."""
        response = self.client.patch('/api/auth/me/', {'role': 'vet'}, format='json')
        # UserSerializer скрывает role (SerializerMethodField — read-only),
        # поэтому просто проверяем 200 и что флаг не изменился.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_veterinarian)


class VetVerificationSignalTests(TestCase):
    """I-7: approve заявки через сигнал делает юзера верифицированным врачом."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='doctor', email='doctor@example.com', password='pass12345',
            is_veterinarian=False, is_verified=False,
        )
        self.request_obj = VetVerificationRequest.objects.create(
            user=self.user,
            document_image='vet_docs/2026/08/doc.jpg',
        )

    def test_approve_sets_verified_and_vet_role(self):
        """При approve сигнал выставляет is_verified=True и is_veterinarian=True."""
        self.request_obj.status = 'approved'
        self.request_obj.save()

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)
        self.assertTrue(self.user.is_veterinarian)

    def test_reject_sets_unverified_but_keeps_role(self):
        """При reject снимается is_verified, но роль врача остаётся."""
        # Сначала сделаем одобренным
        self.request_obj.status = 'approved'
        self.request_obj.save()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_veterinarian)

        # Теперь отклоним
        self.request_obj.status = 'rejected'
        self.request_obj.save()
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_verified)
        # Роль остаётся (по политике P0-6)
        self.assertTrue(self.user.is_veterinarian)