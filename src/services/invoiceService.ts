import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type {
  CustomerRow,
  InvoiceWithDetails,
} from '@/types/invoice';

const LOCAL_STORAGE_CUSTOMERS_KEY = 'invoice_craft_customers';
const LOCAL_STORAGE_INVOICES_KEY = 'invoice_craft_invoices';
const LOCAL_STORAGE_COUNTER_KEY = 'invoice_craft_counter';

// Automatically purge legacy dummy data from older demo keys
(function purgeLegacyDemoData() {
  try {
    const legacyKeys = [
      'invoice_gen_demo_customers',
      'invoice_gen_demo_invoices',
      'invoice_gen_demo_counter',
      'draft_form_state',
    ];
    for (const key of legacyKeys) {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (raw && (raw.includes('Starlight') || raw.includes('c1111111') || raw.includes('a1111111') || raw.includes('Nexus'))) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
})();

export function getLocalCustomers(): CustomerRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: CustomerRow[] = JSON.parse(raw);
    // Filter out any legacy dummy customers that might remain
    return parsed.filter(
      (c) =>
        c &&
        c.name !== 'Starlight Technologies' &&
        c.name !== 'Nexus Retail Pvt Ltd' &&
        c.name !== 'Apex Logistics Corp' &&
        !c.id.startsWith('c1111111')
    );
  } catch {
    return [];
  }
}

export function saveLocalCustomer(customer: CustomerRow): CustomerRow {
  const existing = getLocalCustomers();
  const updated = [customer, ...existing.filter((c) => c.id !== customer.id)];
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save customer to local storage:', e);
  }
  return customer;
}

/**
 * Fetches the active business ID.
 * If user is authenticated, retrieves their business.
 * If no live business found, returns a default fallback UUID.
 */
export async function getActiveBusinessId(): Promise<string> {
  if (!isSupabaseConfigured) {
    return 'b1111111-1111-1111-1111-111111111111';
  }

  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error || !business) {
      return 'b1111111-1111-1111-1111-111111111111';
    }
    return business.id;
  } catch {
    return 'b1111111-1111-1111-1111-111111111111';
  }
}

/**
 * Fetch all available customers for the invoice selector.
 */
export async function fetchCustomers(businessId?: string): Promise<CustomerRow[]> {
  if (!isSupabaseConfigured) {
    return getLocalCustomers();
  }

  try {
    let query = supabase.from('customers').select('*');
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not fetch from Supabase customers table, falling back to local list:', error.message);
      return getLocalCustomers();
    }

    if (data && data.length > 0) {
      return data.filter(
        (c) =>
          c.name !== 'Starlight Technologies' &&
          c.name !== 'Nexus Retail Pvt Ltd' &&
          c.name !== 'Apex Logistics Corp'
      );
    }

    return getLocalCustomers();
  } catch (err) {
    console.warn('Supabase fetch error, using local fallback:', err);
    return getLocalCustomers();
  }
}

/**
 * Create a new customer on the fly.
 */
export async function createQuickCustomer(payload: {
  name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  business_id?: string;
}): Promise<CustomerRow> {
  const bId = payload.business_id || (await getActiveBusinessId());

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: bId,
          name: payload.name.trim(),
          email: payload.email?.trim() || null,
          phone: payload.phone?.trim() || null,
          billing_address: payload.billing_address?.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        saveLocalCustomer(data);
        return data;
      }
      console.warn('Error inserting customer into Supabase, saving locally:', error?.message);
    } catch (err) {
      console.warn('Supabase quick customer creation exception:', err);
    }
  }

  // Fallback local storage creation
  const newCustomer: CustomerRow = {
    id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    business_id: bId,
    name: payload.name.trim(),
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || null,
    billing_address: payload.billing_address?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return saveLocalCustomer(newCustomer);
}

/**
 * Fetches the next sequential invoice number (e.g. INV-001)
 */
export async function fetchNextInvoiceNumber(businessId?: string): Promise<string> {
  const bId = businessId || (await getActiveBusinessId());

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('generate_invoice_number', {
        p_business_id: bId,
      });

      if (!error && data) {
        return data;
      }
      console.warn('RPC generate_invoice_number failed or not available:', error?.message);
    } catch (err) {
      console.warn('Supabase RPC call error:', err);
    }
  }

  // Fallback sequential counter (starts at 1)
  try {
    const rawCount = localStorage.getItem(LOCAL_STORAGE_COUNTER_KEY);
    const currentCount = rawCount ? parseInt(rawCount, 10) : 0;
    const nextCount = currentCount + 1;
    localStorage.setItem(LOCAL_STORAGE_COUNTER_KEY, nextCount.toString());
    return `INV-${String(nextCount).padStart(3, '0')}`;
  } catch {
    return `INV-001`;
  }
}

export interface CreateInvoicePayload {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  discountAmount: number;
  notes: string | null;
  paymentInstructions?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
  businessId?: string;
}

/**
 * Creates a Draft Invoice and its Line Items in Supabase (or local storage).
 */
export async function createDraftInvoice(
  payload: CreateInvoicePayload
): Promise<{ invoice: InvoiceWithDetails; isLiveDb: boolean }> {
  const bId = payload.businessId || (await getActiveBusinessId());

  if (isSupabaseConfigured) {
    try {
      // 1. Insert Invoice Header (status: 'draft')
      const { data: headerData, error: headerError } = await supabase
        .from('invoices')
        .insert({
          business_id: bId,
          customer_id: payload.customerId,
          invoice_number: payload.invoiceNumber,
          status: 'draft',
          invoice_date: payload.invoiceDate || new Date().toISOString().split('T')[0],
          due_date: payload.dueDate || null,
          discount_amount: Number(payload.discountAmount) || 0,
          notes: payload.notes?.trim() || null,
          payment_instructions: payload.paymentInstructions?.trim() || null,
        })
        .select()
        .single();

      if (headerError) {
        console.error('Failed to create invoice header in Supabase:', headerError);
        throw new Error(headerError.message || 'Failed to create invoice header in Supabase');
      }

      const invoiceId = headerData.id;

      // 2. Insert Line Items
      const itemsToInsert = payload.items.map((item) => ({
        invoice_id: invoiceId,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        tax_rate: Number(item.tax_rate),
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error('Failed to insert invoice items in Supabase:', itemsError);
        throw new Error(itemsError.message || 'Failed to insert line items in Supabase');
      }

      // 3. Fetch authoritative updated invoice record with DB-trigger calculated totals
      const { data: refreshedInvoice, error: refreshError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (!refreshError && refreshedInvoice) {
        return {
          invoice: refreshedInvoice as unknown as InvoiceWithDetails,
          isLiveDb: true,
        };
      }

      return {
        invoice: {
          ...headerData,
          items: itemsData || [],
        },
        isLiveDb: true,
      };
    } catch (err: any) {
      console.warn('Live Supabase save failed, falling back to simulated database calculation:', err);
    }
  }

  // --- Simulated Database Calculation Engine (Exact replica of PostgreSQL trigger logic) ---
  const computedItems = payload.items.map((item, idx) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const taxRate = Number(item.tax_rate) || 0;
    const lineAmount = Math.round(qty * price * 100) / 100;

    return {
      id: `item_${Date.now()}_${idx}`,
      invoice_id: `inv_${Date.now()}`,
      description: item.description.trim(),
      quantity: qty,
      unit_price: price,
      tax_rate: taxRate,
      line_amount: lineAmount,
      created_at: new Date().toISOString(),
    };
  });

  const subtotal = computedItems.reduce((acc, it) => acc + it.line_amount, 0);
  const taxAmount = computedItems.reduce(
    (acc, it) => acc + Math.round((it.line_amount * it.tax_rate) / 100 * 100) / 100,
    0
  );
  const discountAmount = Number(payload.discountAmount) || 0;
  const totalAmount = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);

  const customers = getLocalCustomers();
  const customer = customers.find((c) => c.id === payload.customerId) || null;

  const invoiceRecord: InvoiceWithDetails = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    business_id: bId,
    customer_id: payload.customerId,
    invoice_number: payload.invoiceNumber,
    status: 'draft',
    invoice_date: payload.invoiceDate,
    due_date: payload.dueDate || null,
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    notes: payload.notes?.trim() || null,
    payment_instructions: payload.paymentInstructions?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer,
    items: computedItems,
  };

  // Save to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    const existing: InvoiceWithDetails[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(
      (inv) =>
        inv.invoice_number !== 'INV-001' ||
        (inv.customer?.name !== 'Starlight Technologies' && inv.customer?.name !== 'Nexus Retail Pvt Ltd')
    );
    localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify([invoiceRecord, ...filtered]));
  } catch (err) {
    console.error('Failed to cache invoice in local storage:', err);
  }

  return {
    invoice: invoiceRecord,
    isLiveDb: false,
  };
}

/**
 * Fetch all invoices from Supabase (or local fallback).
 */
export async function listAllInvoices(businessId?: string): Promise<InvoiceWithDetails[]> {
  if (isSupabaseConfigured) {
    try {
      const bId = businessId || (await getActiveBusinessId());
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .eq('business_id', bId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.filter(
          (inv) =>
            inv.customer?.name !== 'Starlight Technologies' &&
            inv.customer?.name !== 'Nexus Retail Pvt Ltd' &&
            inv.customer?.name !== 'Apex Logistics Corp'
        ) as unknown as InvoiceWithDetails[];
      }
    } catch (err) {
      console.warn('Could not fetch invoices from Supabase, falling back:', err);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    if (raw) {
      const parsed: InvoiceWithDetails[] = JSON.parse(raw);
      return parsed.filter(
        (inv) =>
          inv.customer?.name !== 'Starlight Technologies' &&
          inv.customer?.name !== 'Nexus Retail Pvt Ltd' &&
          inv.customer?.name !== 'Apex Logistics Corp' &&
          !inv.id.startsWith('a1111111') &&
          !inv.id.startsWith('a2222222') &&
          !inv.id.startsWith('a3333333')
      );
    }
  } catch {}

  return [];
}

/**
 * Fetch Business Profile from Supabase (or clean defaults).
 */
export async function fetchBusinessProfile() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch {}
  }

  return {
    id: 'b1111111-1111-1111-1111-111111111111',
    name: 'Your Company Name',
    logo_url: '',
    email: 'contact@yourcompany.com',
    phone: '+1 (555) 000-0000',
    address: '123 Business Street, Suite 100, City, Country',
    gstin: '',
    default_currency: 'USD',
    invoice_prefix: 'INV',
    invoice_counter: 0,
  };
}

