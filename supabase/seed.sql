-- =============================================================================
-- Supabase Development Seed Data (supabase/seed.sql)
--
-- PURPOSE:
--   Populates realistic demo data for local development and testing of the
--   Invoice Generator MVP.
--
-- CREATED DATA:
--   1. Auth User: demo@acmedesign.com / password123
--   2. Profile: Alex Morgan (auto-created via trigger, updated with details)
--   3. Business: Acme Design Studio
--   4. Customers: Starlight Technologies, Nexus Retail Pvt Ltd, Apex Logistics Corp
--   5. Invoices: 3 invoices representing Draft, Sent, and Paid states
--   6. Invoice Items: Realistic line items (triggers auto-calculate amounts)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Demo Auth User (password: password123)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  'd0d1b9e2-3b4a-4e8a-b5d1-9f8e7d6c5b4a'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo@acmedesign.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"full_name": "Alex Morgan"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Update phone on profile created by handle_new_user trigger
UPDATE public.profiles
SET phone = '+1 (555) 234-5678'
WHERE id = 'd0d1b9e2-3b4a-4e8a-b5d1-9f8e7d6c5b4a'::uuid;

-- ---------------------------------------------------------------------------
-- 2. Business (Acme Design Studio)
-- ---------------------------------------------------------------------------
INSERT INTO public.businesses (
  id,
  user_id,
  name,
  logo_url,
  email,
  phone,
  address,
  gstin,
  default_currency,
  invoice_prefix,
  invoice_counter
) VALUES (
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'd0d1b9e2-3b4a-4e8a-b5d1-9f8e7d6c5b4a'::uuid,
  'Acme Design Studio',
  'https://raw.githubusercontent.com/supabase/supabase/master/web/static/img/supabase-logo.svg',
  'billing@acmedesign.com',
  '+1 (555) 234-5678',
  '100 Tech Blvd, Suite 400, San Francisco, CA 94107',
  '29ABCDE1234F1ZH',
  'USD',
  'INV',
  3
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Customers (3 Realistic Demo Clients)
-- ---------------------------------------------------------------------------
INSERT INTO public.customers (
  id,
  business_id,
  name,
  email,
  phone,
  billing_address
) VALUES
(
  'c1111111-1111-1111-1111-111111111111'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'Starlight Technologies',
  'accounts@starlight.io',
  '+1 (555) 987-6543',
  '456 Innovation Way, Austin, TX 78701'
),
(
  'c2222222-2222-2222-2222-222222222222'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'Nexus Retail Pvt Ltd',
  'finance@nexusretail.com',
  '+91 98765 43210',
  '78 Commercial Street, Bengaluru, KA 560001'
),
(
  'c3333333-3333-3333-3333-333333333333'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'Apex Logistics Corp',
  'ap@apexlogistics.com',
  '+1 (555) 345-6789',
  '12 Freight Plaza, Chicago, IL 60607'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Invoices (3 Invoices: Sent, Paid, Draft)
-- Note: subtotal, tax_amount, total_amount are omitted here so database
--       triggers calculate them automatically when items are inserted below.
-- ---------------------------------------------------------------------------
INSERT INTO public.invoices (
  id,
  business_id,
  customer_id,
  invoice_number,
  status,
  invoice_date,
  due_date,
  discount_amount,
  notes,
  payment_instructions
) VALUES
(
  'i1111111-1111-1111-1111-111111111111'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'c1111111-1111-1111-1111-111111111111'::uuid,
  'INV-001',
  'sent',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '15 days',
  500.00,
  'Thank you for working with Acme Design Studio.',
  'Bank Transfer to Account: 1234-5678-9012, Routing: 987654321'
),
(
  'i2222222-2222-2222-2222-222222222222'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'c2222222-2222-2222-2222-222222222222'::uuid,
  'INV-002',
  'paid',
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '15 days',
  0.00,
  'Payment received in full. Thank you!',
  'Paid via Wire Transfer'
),
(
  'i3333333-3333-3333-3333-333333333333'::uuid,
  'b1111111-1111-1111-1111-111111111111'::uuid,
  'c3333333-3333-3333-3333-333333333333'::uuid,
  'INV-003',
  'draft',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  0.00,
  'Draft invoice for upcoming brand refresh project.',
  'Payment terms: Net 30 days.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Invoice Items (Line items for each invoice)
-- Note: line_amount is omitted so BEFORE trigger calculates quantity * unit_price.
--       AFTER trigger then recalculates parent invoice totals automatically.
-- ---------------------------------------------------------------------------
INSERT INTO public.invoice_items (
  invoice_id,
  description,
  quantity,
  unit_price,
  tax_rate
) VALUES
-- Items for Invoice 1 (INV-001)
(
  'i1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'i1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'i1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'i2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'i2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'i3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'i3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
