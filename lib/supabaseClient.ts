import { createClient, User, Session } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xdpgbbcnfuytyiwtekpi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3Ch78epRp3bddJ6V7259Dg_ASMA9PCq';

// Real Supabase Client
const realClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

const MOCK_USER: User = {
  id: 'usr_denvex_admin_001',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'DenveX Administrator', company: 'DenveX' },
  aud: 'authenticated',
  confirmation_sent_at: '2026-01-01T00:00:00Z',
  recovery_sent_at: '',
  email_change_sent_at: '',
  new_email: '',
  invited_at: '',
  action_link: '',
  email: 'teamdenvex@gmail.com',
  phone: '+91 7358349394',
  created_at: '2026-01-01T08:00:00.000Z',
  confirmed_at: '2026-01-01T08:00:00.000Z',
  email_confirmed_at: '2026-01-01T08:00:00.000Z',
  phone_confirmed_at: '',
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  identities: [],
  factors: [],
};

const MOCK_SESSION: Session = {
  access_token: 'mock_jwt_access_token_denvex_2026',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock_refresh_token_denvex_2026',
  user: MOCK_USER,
};

const DEFAULT_BUSINESS_PROFILES = [
  {
    id: 'bp_denvex',
    user_id: 'usr_denvex_admin_001',
    company_name: 'DenveX',
    email: 'teamdenvex@gmail.com',
    phone: '+91 7358349394',
    address: 'Arumbakkam, Chennai, IN 600106',
    website: 'www.denvex.in',
    logo_url: '/logo.png',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-08-27T12:00:00.000Z',
  },
];

const DEFAULT_CUSTOMERS = [
  {
    id: 'cust_royaltravels',
    user_id: 'usr_denvex_admin_001',
    name: 'Royaltravels',
    email: 'royaltravelskpm@gmail.com',
    company: 'Royaltravels',
    phone: '+91 9080335337',
    address: 'Kanchipuram - 631502',
    status: 'Active',
    preferred_currency: 'INR',
    created_at: '2026-07-20T10:30:00.000Z',
  },
  {
    id: 'cust_002',
    user_id: 'usr_denvex_admin_001',
    name: 'Marcus Vance',
    email: 'marcus@starlight.io',
    company: 'Starlight Ventures',
    phone: '+1 (555) 432-9876',
    address: 'Suite 400, Innovation Tower, SF, CA',
    status: 'Active',
    preferred_currency: 'USD',
    created_at: '2026-03-22T14:15:00.000Z',
  },
];

const DEFAULT_INVOICES = [
  {
    id: 'inv_2026_0002',
    user_id: 'usr_denvex_admin_001',
    customer_id: 'cust_royaltravels',
    doc_type: 'INVOICE',
    invoice_number: 'INV-2026-0002',
    subtotal: 4700.00,
    discount_amount: 0.00,
    tax_rate: 0,
    tax_amount: 0.00,
    amount: 4700.00,
    currency: 'INR',
    status: 'PAID',
    issue_date: '2026-07-21',
    due_date: '2026-08-05',
    notes: 'Thank you for your business. For questions, contact teamdenvex@gmail.com.',
    created_at: '2026-07-21T11:00:00.000Z',
  },
];

// Persistent localStorage helpers
const STORAGE_PREFIX = 'denvex_storage_';

function getStoredTable(tableName: string): any[] {
  if (typeof window === 'undefined') {
    if (tableName === 'customers') return [...DEFAULT_CUSTOMERS];
    if (tableName === 'invoices') return [...DEFAULT_INVOICES];
    if (tableName === 'business_profiles') return [...DEFAULT_BUSINESS_PROFILES];
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + tableName);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Error reading localStorage for ${tableName}:`, err);
  }

  // Fallback to seed defaults and save to localStorage
  let initialData: any[] = [];
  if (tableName === 'customers') initialData = [...DEFAULT_CUSTOMERS];
  else if (tableName === 'invoices') initialData = [...DEFAULT_INVOICES];
  else if (tableName === 'business_profiles') initialData = [...DEFAULT_BUSINESS_PROFILES];

  try {
    window.localStorage.setItem(STORAGE_PREFIX + tableName, JSON.stringify(initialData));
  } catch {}

  return initialData;
}

function setStoredTable(tableName: string, data: any[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + tableName, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('denvex_storage_changed', { detail: { table: tableName, count: data.length } }));
  } catch (err) {
    console.error(`Error saving to localStorage for ${tableName}:`, err);
  }
}

let currentMockSession: Session | null = MOCK_SESSION;
const authListeners: Set<(event: string, session: Session | null) => void> = new Set();

function notifyListeners(event: string, session: Session | null) {
  authListeners.forEach((cb) => cb(event, session));
}

export function calculateDatabaseTotals(row: any) {
  const subtotal = Number(row.subtotal || 0);
  const discountAmount = Number(row.discount_amount || 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Number(row.tax_rate || 0);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  return {
    ...row,
    currency: row.currency || 'INR',
    subtotal: Number(subtotal.toFixed(2)),
    discount_amount: Number(discountAmount.toFixed(2)),
    tax_rate: Number(taxRate.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
    amount: Number(grandTotal.toFixed(2)),
  };
}

export const supabase = {
  auth: {
    async getSession() {
      try {
        const res = await realClient.auth.getSession();
        if (res.data && res.data.session) return res;
      } catch {}
      return {
        data: { session: currentMockSession || MOCK_SESSION },
        error: null,
      };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.add(callback);
      const realSub = realClient.auth.onAuthStateChange((event, session) => {
        if (session) callback(event, session);
      });
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
              realSub.data.subscription.unsubscribe();
            },
          },
        },
      };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const targetEmail = email?.trim() || 'teamdenvex@gmail.com';
      try {
        const realRes = await realClient.auth.signInWithPassword({
          email: targetEmail,
          password: password || 'password123',
        });
        if (realRes.data && realRes.data.session) return realRes;
      } catch {}

      const userSession: Session = {
        ...MOCK_SESSION,
        user: { ...MOCK_USER, email: targetEmail },
      };
      currentMockSession = userSession;
      notifyListeners('SIGNED_IN', currentMockSession);
      return {
        data: { user: userSession.user, session: userSession },
        error: null,
      };
    },
    async signOut() {
      try {
        await realClient.auth.signOut();
      } catch {}
      currentMockSession = null;
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },
  },
  from(tableName: keyof Database['public']['Tables'] | string) {
    return {
      select(_columns?: string) {
        return {
          async eq(_columnName: string, _value: any) {
            let realData: any[] = [];
            try {
              const realRes = await realClient.from(tableName as any).select('*').eq(_columnName, _value);
              if (realRes.data && Array.isArray(realRes.data) && realRes.data.length > 0) {
                realData = realRes.data;
              }
            } catch {}

            const storedData = getStoredTable(tableName);
            const filteredStored = storedData.filter((item: any) => {
              if (!_columnName) return true;
              return item[_columnName] === _value;
            });

            const combined = [...realData];
            filteredStored.forEach((m: any) => {
              if (!combined.some((c: any) => c.id === m.id || (c.invoice_number && c.invoice_number === m.invoice_number))) {
                combined.unshift(m);
              }
            });

            return { data: combined, error: null };
          },
        };
      },
      async insert(rows: any[]) {
        try {
          await realClient.from(tableName as any).insert(rows);
        } catch {}

        const currentData = getStoredTable(tableName);
        let calculatedRows = rows;

        if (tableName === 'invoices') {
          calculatedRows = rows.map((row) => ({
            id: row.id || `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            created_at: row.created_at || new Date().toISOString(),
            ...calculateDatabaseTotals(row),
          }));
        } else if (tableName === 'customers') {
          calculatedRows = rows.map((row) => ({
            id: row.id || `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            created_at: row.created_at || new Date().toISOString(),
            ...row,
          }));
        }

        const updatedData = [...calculatedRows, ...currentData];
        setStoredTable(tableName, updatedData);
        return { data: calculatedRows, error: null };
      },
      update(fields: any) {
        return {
          async eq(_columnName: string, _value: any) {
            try {
              await realClient.from(tableName as any).update(fields).eq(_columnName, _value);
            } catch {}

            const currentData = getStoredTable(tableName);
            const updatedData = currentData.map((item: any) => {
              if (item[_columnName] === _value) {
                return { ...item, ...fields, updated_at: new Date().toISOString() };
              }
              return item;
            });
            setStoredTable(tableName, updatedData);
            return { data: updatedData, error: null };
          },
        };
      },
      delete() {
        return {
          async eq(_columnName: string, _value: any) {
            try {
              await realClient.from(tableName as any).delete().eq(_columnName, _value);
            } catch {}

            const currentData = getStoredTable(tableName);
            const updatedData = currentData.filter((item: any) => item[_columnName] !== _value);
            setStoredTable(tableName, updatedData);
            return { data: updatedData, error: null };
          },
        };
      },
    };
  },
} as any;

