from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from .models import Invoice, CatalogItem

User = get_user_model()


class InvoiceIsolationTests(TestCase):
    """P0-1: ни один пользователь не должен видеть чужие счета."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            username='vet_a', email='vet_a@example.com', password='pass12345'
        )
        self.user_b = User.objects.create_user(
            username='vet_b', email='vet_b@example.com', password='pass12345'
        )
        self.item = CatalogItem.objects.create(
            name='Consultation',
            code='CONS-1',
            item_type='service',
            price='50.00',
            created_by=self.user_a,
        )

        self.invoice_a = Invoice.objects.create(
            created_by=self.user_a,
            client=self.user_a,
            status='draft',
        )
        self.invoice_b = Invoice.objects.create(
            created_by=self.user_b,
            client=self.user_b,
            status='draft',
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

    def test_list_returns_only_own_invoices(self):
        """Пользователь A видит только свои счета, не счета B."""
        response = self.client_a.get('/api/billing/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [inv['id'] for inv in response.data]
        self.assertIn(self.invoice_a.id, ids)
        self.assertNotIn(self.invoice_b.id, ids)

    def test_retrieve_foreign_invoice_returns_404(self):
        """Пользователь A не может прочитать счёт B по id."""
        response = self.client_a.get(f'/api/billing/invoices/{self.invoice_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_foreign_invoice_returns_404(self):
        """Пользователь A не может обновить счёт B."""
        response = self.client_a.patch(
            f'/api/billing/invoices/{self.invoice_b.id}/',
            {'status': 'paid'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_foreign_invoice_returns_404(self):
        """Пользователь A не может удалить счёт B."""
        response = self.client_a.delete(f'/api/billing/invoices/{self.invoice_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_sets_created_by_to_request_user(self):
        """Создание счёта автоматически фиксирует created_by = текущий юзер."""
        payload = {
            'client': self.user_a.id,
            'status': 'draft',
            'items': [
                {'item_id': self.item.id, 'quantity': 1},
            ],
        }
        response = self.client_a.post('/api/billing/invoices/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        invoice = Invoice.objects.get(id=response.data['id'])
        self.assertEqual(invoice.created_by, self.user_a)


class InvoiceEditorPermissionTest(TestCase):
    """P0-1: владелец питомца может видеть счёт, привязанный к его питомцу."""

    def setUp(self):
        from pets.models import Pet

        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='pass12345'
        )
        self.vet = User.objects.create_user(
            username='vet', email='vet@example.com', password='pass12345'
        )

        self.pet = Pet.objects.create(
            owner=self.owner,
            name='Rex',
            gender='M',
        )

        self.invoice = Invoice.objects.create(
            created_by=self.vet,
            pet=self.pet,
            status='unpaid',
        )

        self.client_vet = APIClient()
        self.client_vet.force_authenticate(user=self.vet)

        self.client_owner = APIClient()
        self.client_owner.force_authenticate(user=self.owner)

    def test_vet_can_see_own_invoice(self):
        response = self.client_vet.get(f'/api/billing/invoices/{self.invoice.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pet_owner_can_see_invoice_for_their_pet(self):
        response = self.client_owner.get(f'/api/billing/invoices/{self.invoice.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stranger_cannot_see_invoice(self):
        stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com', password='pass12345'
        )
        client = APIClient()
        client.force_authenticate(user=stranger)
        response = client.get(f'/api/billing/invoices/{self.invoice.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class InvoiceTotalsAndStockTests(TestCase):
    """I-5: корректный расчёт tax/total и списание склада при paid."""

    def setUp(self):
        from .models import InvoiceItem

        self.vet = User.objects.create_user(
            username='vet_tot', email='vet_tot@example.com', password='pass12345'
        )
        # Товар со складом и налогом 19%
        self.stock_item = CatalogItem.objects.create(
            name='Vaccine', code='VAC-1', item_type='good',
            price='100.00', tax_percent='19.00',
            is_stock_tracked=True, stock_quantity=10,
            created_by=self.vet,
        )
        self.invoice = Invoice.objects.create(created_by=self.vet, status='draft')

        InvoiceItem.objects.create(
            invoice=self.invoice,
            item=self.stock_item,
            quantity=2,
        )

    def test_tax_and_total_calculated(self):
        """2 шт × 100 € = 200 € subtotal; tax 19% = 38 €; total = 238 €."""
        self.invoice.refresh_from_db()
        self.assertEqual(float(self.invoice.total_amount), 238.00)
        self.assertEqual(float(self.invoice.tax_amount), 38.00)

    def test_stock_decremented_on_paid(self):
        """Переход в paid списывает остатки: 10 → 8."""
        self.invoice.status = 'paid'
        self.invoice.save()
        self.stock_item.refresh_from_db()
        self.assertEqual(self.stock_item.stock_quantity, 8)

    def test_stock_not_decremented_before_paid(self):
        """Пока статус не paid, остатки не меняются."""
        self.invoice.status = 'unpaid'
        self.invoice.save()
        self.stock_item.refresh_from_db()
        self.assertEqual(self.stock_item.stock_quantity, 10)
