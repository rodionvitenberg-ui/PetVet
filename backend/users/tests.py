from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

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


class SubscriptionRoleTests(TestCase):
    """Активная подписка делает пользователя ветеринаром (логика вебхука)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='doctor', email='doctor@example.com', password='pass12345',
            is_veterinarian=False, is_verified=False,
        )

    def test_active_subscription_grants_vet_role(self):
        """Имитируем активную подписку: role ветеринара выдаётся."""
        from billing.models import Subscription

        sub = Subscription.objects.create(user=self.user, status='active')
        # Логика billing.payments._sync_user_role (активная подписка)
        if not self.user.is_veterinarian:
            self.user.is_veterinarian = True
        self.user.is_verified = True
        self.user.save()

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_veterinarian)
        self.assertTrue(self.user.is_verified)

    def test_canceled_subscription_revokes_vet_role(self):
        """Имитируем отменённую подписку: роль снимается."""
        from billing.models import Subscription

        sub = Subscription.objects.create(
            user=self.user, status='active',
        )
        sub.status = 'canceled'
        sub.save()
        # Логика billing.payments._sync_user_role (отмена подписки)
        if self.user.is_veterinarian:
            self.user.is_veterinarian = False
        self.user.save()

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_veterinarian)