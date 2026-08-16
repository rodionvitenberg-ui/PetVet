export interface CatalogItem {
  id: number;
  name: string;
  price: string;
  item_type: 'service' | 'good';
}

export interface InvoiceItemDraft {
  item_id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Template {
  id: number;
  name: string;
  description_template: string;
  items: { item_id: number; item_name: string; item_price: string; quantity: number }[];
}

export interface EventFormData {
  status: string;
  title: string;
  date: string;
  next_date: string;
  description: string;
}