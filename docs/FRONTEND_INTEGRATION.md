# Frontend Integration Contract & Developer Guide

This document is the authoritative integration contract for the two frontend developers building the Invoice Generator SaaS UI.

It covers Supabase client setup, Authentication, Business Setup, Customer Management, Invoice Creation, Status Updates, Automatic Calculations, PDF Generation, Logo Uploads, Dashboard Queries, and Error Handling.

---

## Table of Contents
1. [Supabase Client Setup](#1-supabase-client-setup)
2. [Authentication](#2-authentication)
3. [Business Profile](#3-business-profile)
4. [Customers](#4-customers)
5. [Invoices](#5-invoices)
6. [Invoice Calculations](#6-invoice-calculations)
7. [Invoice Creation Flow](#7-invoice-creation-flow)
8. [Invoice Status & State Handling](#8-invoice-status--state-handling)
9. [PDF Generation](#9-pdf-generation)
10. [Business Logo Uploads](#10-business-logo-uploads)
11. [Dashboard Queries](#11-dashboard-queries)
12. [TypeScript Types](#12-typescript-types)
13. [Error Handling](#13-error-handling)
14. [Frontend Team Division of Work](#14-frontend-team-division-of-work)
15. [MVP Complete Frontend User Journey](#15-mvp-complete-frontend-user-journey)

---

## 1. Supabase Client Setup

### Environment Variables
Store environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!CAUTION]
> **NEVER** include or expose the `SUPABASE_SERVICE_ROLE_KEY` in frontend code or repository. Only the public `ANON` key must be used in frontend applications.

### Client Initialization
Create `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

---

## 2. Authentication

Supabase Auth manages user authentication. The database auto-creates a row in `public.profiles` whenever a user signs up.

### Sign Up
```typescript
import { supabase } from '@/lib/supabaseClient';

export async function signUpUser(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}
```

### Login
```typescript
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}
```

### Logout
```typescript
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

### Get Current User & Session
```typescript
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
```

---

## 3. Business Profile

Every authenticated user owns exactly **1 Business Profile** (`1 User = 1 Business`).

### Required vs Optional Fields
- **Required**: `name` (text, non-empty)
- **Optional**: `logo_url`, `email`, `phone`, `address`, `gstin`, `default_currency` (default: `'USD'`), `invoice_prefix` (default: `'INV'`)

### Get Current User's Business
```typescript
import { supabase } from '@/lib/supabaseClient';
import type { Business } from '../../database.types';

export async function getMyBusiness(): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

### Create Business Setup
```typescript
export async function createBusiness(payload: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  logo_url?: string;
  default_currency?: string;
  invoice_prefix?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      user_id: user.id,
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      gstin: payload.gstin || null,
      logo_url: payload.logo_url || null,
      default_currency: payload.default_currency || 'USD',
      invoice_prefix: payload.invoice_prefix || 'INV',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Update Business Profile
```typescript
export async function updateBusiness(businessId: string, updates: Partial<Business>) {
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## 4. Customers

Customers belong to a business (`business_id`). Row Level Security (RLS) automatically blocks users from accessing other users' customers.

### Create Customer
```typescript
export async function createCustomer(payload: {
  business_id: string;
  name: string;
  email?: string;
  phone?: string;
  billing_address?: string;
}) {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      business_id: payload.business_id,
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      billing_address: payload.billing_address || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### List Customers
```typescript
export async function listCustomers(businessId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### Get Single Customer Details
```typescript
export async function getCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) throw error;
  return data;
}
```

### Update Customer
```typescript
export async function updateCustomer(customerId: string, updates: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Delete Customer
```typescript
export async function deleteCustomer(customerId: string) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (error) throw error;
}
```
*Note: Customer deletion is blocked (`FK RESTRICT`) if invoices reference this customer.*

---

## 5. Invoices

### Generate Sequential Invoice Number Server-Side
Before creating an invoice header, generate the sequential invoice number (e.g., `INV-001`):

```typescript
export async function fetchNextInvoiceNumber(businessId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invoice_number', {
    p_business_id: businessId,
  });

  if (error) throw error;
  return data; // Returns e.g. "INV-001"
}
```

### Create Draft Invoice Header
New invoices default to `status = 'draft'`:

```typescript
export async function createInvoiceHeader(payload: {
  business_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date?: string; // YYYY-MM-DD
  due_date?: string;     // YYYY-MM-DD
  discount_amount?: number;
  notes?: string;
  payment_instructions?: string;
}) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      business_id: payload.business_id,
      customer_id: payload.customer_id,
      invoice_number: payload.invoice_number,
      status: 'draft',
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || null,
      discount_amount: payload.discount_amount || 0,
      notes: payload.notes || null,
      payment_instructions: payload.payment_instructions || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Add Line Item to Invoice
```typescript
export async function addInvoiceItem(payload: {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}) {
  const { data, error } = await supabase
    .from('invoice_items')
    .insert({
      invoice_id: payload.invoice_id,
      description: payload.description,
      quantity: payload.quantity,
      unit_price: payload.unit_price,
      tax_rate: payload.tax_rate,
      // line_amount is auto-calculated by DB trigger!
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Fetch Invoice with Customer & Items
```typescript
export async function getInvoice(invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      items:invoice_items(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) throw error;
  return data;
}
```

### List Invoices
```typescript
export async function listInvoices(businessId: string, statusFilter?: 'draft' | 'sent' | 'paid') {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(name, email)
    `)
    .eq('business_id', businessId);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### Update Invoice Status (Mark Sent / Mark Paid)
```typescript
export async function updateInvoiceStatus(invoiceId: string, status: 'draft' | 'sent' | 'paid') {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const markInvoiceAsSent = (invoiceId: string) => updateInvoiceStatus(invoiceId, 'sent');
export const markInvoiceAsPaid = (invoiceId: string) => updateInvoiceStatus(invoiceId, 'paid');
```

### Delete Draft Invoice
```typescript
export async function deleteInvoice(invoiceId: string) {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) throw error;
}
```

---

## 6. Invoice Calculations

> [!IMPORTANT]
> **Source of Truth**: The frontend MUST NOT send manual calculated fields (`line_amount`, `subtotal`, `tax_amount`, `total_amount`) as authoritative values to the backend.

### Flow:
1. **Frontend submits**:
   - `description`, `quantity`, `unit_price`, `tax_rate`
2. **Database Trigger computes**:
   - `line_amount = ROUND(quantity * unit_price, 2)`
   - `subtotal = SUM(line_amount)`
   - `tax_amount = SUM(ROUND(line_amount * tax_rate / 100, 2))`
   - `total_amount = subtotal + tax_amount - discount_amount`
3. **Frontend reads**:
   - The updated invoice record with authoritative computed totals.

---

## 7. Invoice Creation Flow

Follow this exact sequence in the UI:

```text
User selects / adds Customer
            ↓
Fetch next invoice number via RPC generate_invoice_number()
            ↓
Create Invoice Header (invoices table, status = 'draft')
            ↓
Insert Line Items (invoice_items table)
            ↓
DB triggers compute line_amount & invoice totals
            ↓
Fetch updated Invoice with Items (getInvoice())
            ↓
Render Invoice Preview in UI
            ↓
Call generate-pdf Edge Function to download PDF
            ↓
Mark Sent / Mark Paid
```

---

## 8. Invoice Status & State Handling

The `invoices.status` column stores one of three simple string values:

$$\text{draft} \longrightarrow \text{sent} \longrightarrow \text{paid}$$

- **`draft`**: Invoice is being edited. Line items can be added, updated, or removed.
- **`sent`**: Invoice has been delivered to the customer. Ready to record payment.
- **`paid`**: Invoice has been settled in full.

### Database Constraint:
```sql
CHECK (status IN ('draft', 'sent', 'paid'))
```
Submitting any other status value will result in a PostgreSQL `check_violation` (23514) error.

---

## 9. PDF Generation

Call the deployed Supabase Edge Function `generate-pdf` using the user's session JWT token.

### TypeScript Function to Fetch & Download PDF HTML/Stream:
```typescript
export async function downloadInvoicePDF(invoiceId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    }
  );

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Failed to generate PDF');
  }

  const htmlContent = await response.text();

  // Open preview window or trigger browser print/download
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}
```

---

## 10. Business Logo Uploads

Logos are stored in the public Supabase Storage bucket `business-logos` under `<user_id>/<filename>`.

### Upload Logo Function
```typescript
export async function uploadBusinessLogo(file: File): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthenticated');

  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/logo.${fileExt}`;

  // 1. Upload to storage bucket
  const { error: uploadErr } = await supabase.storage
    .from('business-logos')
    .upload(filePath, file, { upsert: true });

  if (uploadErr) throw uploadErr;

  // 2. Get Public URL
  const { data } = supabase.storage
    .from('business-logos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

### Storage Restrictions:
- Maximum file size: **5MB**
- Allowed types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/svg+xml`

---

## 11. Dashboard Queries

Compute summary metrics directly from the client using Supabase queries:

```typescript
export async function getDashboardMetrics(businessId: string) {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, status, total_amount, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const totalInvoices = invoices.length;
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'draft')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const recentInvoices = invoices.slice(0, 5);

  return {
    totalInvoices,
    totalInvoiceAmount,
    paidAmount,
    pendingAmount,
    recentInvoices,
  };
}
```

---

## 12. TypeScript Types

Import convenience types directly from `database.types.ts`:

```typescript
import type {
  Business,
  Customer,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceWithDetails
} from '../../database.types';
```

---

## 13. Error Handling

Handle standard Supabase error structures:

```typescript
try {
  await createInvoiceHeader(payload);
} catch (error: any) {
  if (error.code === '23514') {
    alert('Invalid status or constraint violation. Status must be draft, sent, or paid.');
  } else if (error.code === '23503') {
    alert('Customer not found or invalid.');
  } else if (error.code === '42501') {
    alert('Permission denied. Please check authentication.');
  } else {
    alert(error.message || 'An unexpected error occurred.');
  }
}
```

---

## 14. Frontend Team Division of Work

| Developer | Assigned Responsibilities | Key Files / Views |
|---|---|---|
| **Developer 1** | Auth, Profile, Business Setup, Customer CRUD, Dashboard | `LoginPage`, `RegisterPage`, `BusinessSetupModal`, `CustomerList`, `DashboardView` |
| **Developer 2** | Invoice Form, Line Item Builder, Invoice Status Management (`draft`/`sent`/`paid`), Invoice List, Invoice Preview, PDF Download | `InvoiceCreatePage`, `LineItemTable`, `InvoiceListPage`, `InvoicePreviewModal` |

Both developers share `@/lib/supabaseClient.ts` and `database.types.ts`.

---

## 15. MVP Complete Frontend User Journey

```text
Login / Register
      ↓
Business Setup (Name, Email, Address, GSTIN, Logo)
      ↓
Dashboard Overview
      ↓
Add Customer (Name, Email, Phone, Billing Address)
      ↓
Create Invoice (Select Customer → Fetch Number → status = 'draft')
      ↓
Add Line Items (Description, Qty, Unit Price, Tax Rate)
      ↓
Database Triggers calculate line_amount & invoice total
      ↓
Preview Invoice
      ↓
Generate PDF (Call Edge Function)
      ↓
Download / Print PDF
      ↓
Mark Sent (status = 'sent')
      ↓
Mark Paid (status = 'paid')
```
