// types/invoice.ts — mirrors backend/billing/serializers.py (InvoiceSerializer, InvoiceItemSerializer)

export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'cancelled';

export interface InvoiceItem {
    id: number;
    item_id?: number; // write-only (sent to the backend only)
    quantity: number;
    name_at_moment: string;
    price_at_moment: number;
    subtotal: number;
}

export interface InvoiceClientInfo {
    id: number | null;
    name: string;
    is_shadow?: boolean;
}

export interface Invoice {
    id: number;
    status: InvoiceStatus;
    payment_method: 'cash' | 'card' | 'insurance' | 'mixed';
    total_amount: string;
    tax_amount: string;
    discount_amount: string;
    client?: number | null;
    client_info?: InvoiceClientInfo;
    guest_name?: string;
    pet?: number | null;
    pet_name?: string;
    event?: number | null;
    created_by?: number | null;
    items: InvoiceItem[];
    created_at: string;
    notes?: string;
}

// Payload for creating an invoice
export interface InvoicePayload {
    status?: InvoiceStatus;
    payment_method?: Invoice['payment_method'];
    client?: number | null;
    guest_name?: string;
    pet?: number | null;
    event?: number | null;
    discount_amount?: string;
    notes?: string;
    items: Array<{ item_id: number; quantity: number }>;
}
