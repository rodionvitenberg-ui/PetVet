import { apiClient } from '@/lib/apiClient';

export async function createCheckoutSession(): Promise<{ checkout_url: string }> {
  return apiClient<{ checkout_url: string }>('/api/billing/subscription/checkout/', {
    method: 'POST',
  });
}