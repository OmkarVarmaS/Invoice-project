import type { Database } from '../../database.types';

export type BusinessRow = Database['public']['Tables']['businesses']['Row'];
export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export interface LineItemFormState {
  id: string; // Temporary client key for rendering and list keys
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_amount: number; // Client live calculation for UI preview
}

export interface InvoiceFormState {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: LineItemFormState[];
  discountAmount: number;
  notes: string;
  paymentInstructions?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export interface InvoiceWithDetails extends InvoiceRow {
  customer?: CustomerRow | null;
  items?: InvoiceItemRow[];
}
