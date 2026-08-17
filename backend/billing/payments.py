"""Payment provider integration: Cryptomus (crypto).

Subscriptions are billed in crypto (USDT, BTC and hundreds of other coins).
The webhook is the source of truth for Subscription.status; _sync_user_role()
keeps the veterinarian role in sync with the subscription state.
"""
import hashlib
import json
from datetime import datetime

from django.conf import settings

import requests

from .models import Subscription

CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1'


class ProviderError(Exception):
    """Raised when the provider request fails or is misconfigured."""


def _sync_user_role(sub):
    """Активная подписка = роль ветеринара; отменённая/просроченная = снимает роль."""
    if sub.status == 'active':
        if not sub.user.is_veterinarian:
            sub.user.is_veterinarian = True
        sub.user.is_verified = True
    else:
        if sub.user.is_veterinarian:
            sub.user.is_veterinarian = False
    sub.user.save()


def create_checkout(user) -> str:
    merchant_id = getattr(settings, 'CRYPTOMUS_MERCHANT_ID', '')
    api_key = getattr(settings, 'CRYPTOMUS_API_KEY', '')
    if not merchant_id or not api_key:
        raise ProviderError('Cryptomus API не настроен.')

    sub, _ = Subscription.objects.get_or_create(user=user)

    payload = {
        'amount': str(getattr(settings, 'CRYPTOMUS_AMOUNT', '5')),
        'currency': 'USD',
        'name': 'PetVet Premium (5 USD per month)',
        'period': 'month',
        'url_callback': getattr(settings, 'CRYPTOMUS_WEBHOOK_URL', ''),
        'url_success': getattr(settings, 'CRYPTOMUS_SUCCESS_URL', ''),
        'additional_data': str(user.id),
    }
    body = json.dumps(payload, ensure_ascii=False).encode()
    sign = hashlib.md5(body + api_key.encode()).hexdigest()

    headers = {
        'merchant': merchant_id,
        'sign': sign,
        'Content-Type': 'application/json',
    }
    try:
        resp = requests.post(
            f'{CRYPTOMUS_API_URL}/subscription',
            json=payload,
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        raise ProviderError(f'Cryptomus API error: {exc}') from exc

    if data.get('state') != 0:
        raise ProviderError(data.get('message') or 'Cryptomus API error')

    result = data.get('result') or {}
    checkout_url = result.get('url')
    if not checkout_url:
        raise ProviderError('Cryptomus: no checkout url in response')

    provider_sub_id = result.get('subscription_id') or result.get('uuid')
    if provider_sub_id:
        sub.provider_subscription_id = provider_sub_id
        sub.save(update_fields=['provider_subscription_id', 'updated_at'])

    return checkout_url


def handle_webhook(body: bytes, sign_header: str) -> str:
    api_key = getattr(settings, 'CRYPTOMUS_API_KEY', '')
    if not api_key:
        raise ProviderError('Cryptomus API ключ не настроен.')

    expected = hashlib.md5(body + api_key.encode()).hexdigest()
    if expected != (sign_header or ''):
        raise ProviderError('Invalid Cryptomus signature')

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ProviderError('Invalid payload') from exc

    payment_status = data.get('status')
    subscription_id = data.get('subscription_id')
    if not subscription_id:
        return 'ignored'

    sub = Subscription.objects.filter(
        provider_subscription_id=subscription_id,
    ).first()
    if not sub:
        return 'ignored'

    if payment_status in ('payment_hold', 'payment_done'):
        sub.status = 'active'
    elif payment_status in ('payment_cancel', 'payment_overdue', 'payment_refund'):
        sub.status = 'canceled'
    else:
        return 'ignored'

    expires = data.get('expires_at')
    if expires:
        try:
            sub.current_period_end = datetime.fromisoformat(expires.replace('Z', '+00:00'))
        except ValueError:
            pass

    sub.save(update_fields=['status', 'current_period_end', 'updated_at'])
    _sync_user_role(sub)
    return 'ok'