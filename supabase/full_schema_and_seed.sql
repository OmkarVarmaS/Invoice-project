-- =============================================================================
-- Migration: 20260808000001_create_profiles.sql
-- Description: Creates the profiles table extending auth.users (1:1).
--              Includes set_updated_at helper function and auto-profile trigger.
-- =============================================================================

-- Reusable updated_at timestamp maintenance function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'BEFORE UPDATE trigger function to auto-update updated_at timestamp.';

-- profiles table
CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  avatar_url  text        NULL,
  phone       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'User profile data extending Supabase auth.users.';

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function to auto-create profile row when a user signs up.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000002_create_businesses.sql
-- Description: Creates the businesses table (1 user = 1 business profile).
-- =============================================================================

CREATE TABLE public.businesses (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text          NOT NULL,
  logo_url         text          NULL,
  email            text          NULL,
  phone            text          NULL,
  address          text          NULL,
  gstin            text          NULL,
  default_currency text          NOT NULL DEFAULT 'USD',
  invoice_prefix   text          NOT NULL DEFAULT 'INV',
  invoice_counter  integer       NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT businesses_name_not_empty
    CHECK (length(trim(name)) > 0),

  CONSTRAINT businesses_invoice_counter_non_negative
    CHECK (invoice_counter >= 0),

  CONSTRAINT businesses_invoice_prefix_not_empty
    CHECK (length(trim(invoice_prefix)) > 0)
);

COMMENT ON TABLE public.businesses IS
  'Business profile owned by a user. 1 User = 1 Business profile.';

-- Indexes
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);

-- Trigger for updated_at
CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000003_create_customers.sql
-- Description: Creates the customers table with billing details.
-- =============================================================================

CREATE TABLE public.customers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  email           text        NULL,
  phone           text        NULL,
  billing_address text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customers_name_not_empty
    CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE public.customers IS
  'Customers belonging to a business.';

-- Index
CREATE INDEX idx_customers_business_id ON public.customers(business_id);

-- Trigger for updated_at
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000004_create_invoices.sql
-- Description: Creates the invoices table and the generate_invoice_number function.
-- =============================================================================

-- Atomic invoice number generator function
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter integer;
  v_prefix  text;
BEGIN
  UPDATE public.businesses
  SET invoice_counter = invoice_counter + 1
  WHERE id = p_business_id
  RETURNING invoice_counter, invoice_prefix INTO v_counter, v_prefix;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'generate_invoice_number: business % not found', p_business_id;
  END IF;

  -- Formats as INV-001, INV-002, etc. (3-digit minimum padding)
  RETURN v_prefix || '-' || LPAD(v_counter::text, 3, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_invoice_number(uuid) IS
  'Atomically increments business.invoice_counter and returns next invoice number (e.g. INV-001).';

-- invoices table
CREATE TABLE public.invoices (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          uuid            NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id          uuid            NOT NULL REFERENCES public.customers(id)  ON DELETE RESTRICT,
  invoice_number       text            NOT NULL,
  invoice_date         date            NOT NULL DEFAULT CURRENT_DATE,
  due_date             date            NULL,
  subtotal             numeric(12, 2)  NOT NULL DEFAULT 0,
  tax_amount           numeric(12, 2)  NOT NULL DEFAULT 0,
  discount_amount      numeric(12, 2)  NOT NULL DEFAULT 0,
  total_amount         numeric(12, 2)  NOT NULL DEFAULT 0,
  notes                text            NULL,
  payment_instructions text            NULL,
  created_at           timestamptz     NOT NULL DEFAULT now(),
  updated_at           timestamptz     NOT NULL DEFAULT now(),

  -- Unique invoice number per business
  CONSTRAINT invoices_unique_number_per_business
    UNIQUE (business_id, invoice_number),

  -- Due date rule
  CONSTRAINT invoices_due_date_after_invoice_date
    CHECK (due_date IS NULL OR due_date >= invoice_date),

  -- Non-negative monetary checks
  CONSTRAINT invoices_subtotal_non_negative        CHECK (subtotal >= 0),
  CONSTRAINT invoices_tax_amount_non_negative      CHECK (tax_amount >= 0),
  CONSTRAINT invoices_discount_amount_non_negative CHECK (discount_amount >= 0),
  CONSTRAINT invoices_total_amount_non_negative    CHECK (total_amount >= 0)
);

COMMENT ON TABLE public.invoices IS
  'Invoice headers storing dates, totals, notes, and payment instructions.';

-- Indexes
CREATE INDEX idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);

-- Trigger for updated_at
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000005_create_invoice_items.sql
-- Description: Creates the invoice_items table for manual line item entries.
-- =============================================================================

CREATE TABLE public.invoice_items (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid            NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text            NOT NULL,
  quantity    numeric(10, 3)  NOT NULL DEFAULT 1,
  unit_price  numeric(12, 2)  NOT NULL DEFAULT 0,
  tax_rate    numeric(5, 2)   NOT NULL DEFAULT 0,
  line_amount numeric(12, 2)  NOT NULL DEFAULT 0,
  created_at  timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT invoice_items_description_not_empty
    CHECK (length(trim(description)) > 0),

  CONSTRAINT invoice_items_quantity_positive
    CHECK (quantity > 0),

  CONSTRAINT invoice_items_unit_price_non_negative
    CHECK (unit_price >= 0),

  CONSTRAINT invoice_items_tax_rate_range
    CHECK (tax_rate BETWEEN 0 AND 100),

  CONSTRAINT invoice_items_line_amount_non_negative
    CHECK (line_amount >= 0)
);

COMMENT ON TABLE public.invoice_items IS
  'Manual line items entered directly onto an invoice.';

-- Index for fetching items of an invoice
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000006_enable_rls.sql
-- Description: Enables Row Level Security on all 5 application tables.
-- =============================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000007_create_rls_policies.sql
-- Description: Creates helper function owns_business() and defines RLS policies
--              for profiles, businesses, customers, invoices, and invoice_items.
-- =============================================================================

-- Helper function to verify business ownership
CREATE OR REPLACE FUNCTION public.owns_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.businesses
    WHERE  id      = p_business_id
      AND  user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.owns_business(uuid) IS
  'Returns true if auth.uid() is the owner of the specified business.';

-- ---------------------------------------------------------------------------
-- 1. PROFILES
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. BUSINESSES
-- ---------------------------------------------------------------------------
CREATE POLICY businesses_select_own ON public.businesses
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY businesses_insert_own ON public.businesses
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY businesses_update_own ON public.businesses
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY businesses_delete_own ON public.businesses
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ---------------------------------------------------------------------------
CREATE POLICY customers_select_own ON public.customers
  FOR SELECT TO authenticated USING (public.owns_business(business_id));

CREATE POLICY customers_insert_own ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id));

CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY customers_delete_own ON public.customers
  FOR DELETE TO authenticated USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- 4. INVOICES
-- ---------------------------------------------------------------------------
CREATE POLICY invoices_select_own ON public.invoices
  FOR SELECT TO authenticated USING (public.owns_business(business_id));

CREATE POLICY invoices_insert_own ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id));

CREATE POLICY invoices_update_own ON public.invoices
  FOR UPDATE TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY invoices_delete_own ON public.invoices
  FOR DELETE TO authenticated USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- 5. INVOICE ITEMS
-- ---------------------------------------------------------------------------
CREATE POLICY invoice_items_select_own ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)
    )
  );

CREATE POLICY invoice_items_insert_own ON public.invoice_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)
    )
  );

CREATE POLICY invoice_items_update_own ON public.invoice_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)
    )
  );

CREATE POLICY invoice_items_delete_own ON public.invoice_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)
    )
  );




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000008_create_invoice_triggers.sql
-- Description: Trigger logic for auto-computing line_amount on items, syncing invoice
--              subtotal, tax_amount, and total_amount when items change, and recalculating
--              total_amount when discount_amount is updated on the invoice header.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BEFORE INSERT/UPDATE on invoice_items: compute line_amount
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_invoice_item_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- line_amount = ROUND(quantity * unit_price, 2)
  NEW.line_amount := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_invoice_item_totals() IS
  'BEFORE trigger function to compute line_amount on invoice_items.';

CREATE TRIGGER before_invoice_item_save_calculate
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_item_totals();

-- ---------------------------------------------------------------------------
-- 2. AFTER INSERT/UPDATE/DELETE on invoice_items: sync parent invoice totals
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal   numeric(12, 2);
  v_tax_amount numeric(12, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Aggregate subtotal (sum of line_amount) and tax (sum of line_amount * tax_rate / 100)
  SELECT
    COALESCE(SUM(line_amount), 0),
    COALESCE(SUM(ROUND(line_amount * tax_rate / 100.0, 2)), 0)
  INTO v_subtotal, v_tax_amount
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  -- Update parent invoice totals, preserving discount_amount
  UPDATE public.invoices
  SET
    subtotal     = v_subtotal,
    tax_amount   = v_tax_amount,
    total_amount = v_subtotal + v_tax_amount - discount_amount,
    updated_at   = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.sync_invoice_totals() IS
  'AFTER trigger function to recalculate subtotal, tax_amount, and total_amount on parent invoice.';

CREATE TRIGGER after_invoice_item_change_sync_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_totals();

-- ---------------------------------------------------------------------------
-- 3. BEFORE INSERT/UPDATE on invoices: recalculate total_amount on discount change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_invoice_header_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- total_amount = subtotal + tax_amount - discount_amount
  NEW.total_amount := GREATEST(0, NEW.subtotal + NEW.tax_amount - NEW.discount_amount);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_invoice_header_totals() IS
  'BEFORE trigger function to compute total_amount on invoices when discount_amount or totals change.';

CREATE TRIGGER before_invoice_header_save_calculate
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_header_totals();




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000009_setup_storage.sql
-- Description: Sets up the business-logos storage bucket and RLS security policies.
-- =============================================================================

-- Register public storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

-- RLS policy: Public read access to business logos
CREATE POLICY "Public Read Access for Business Logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

-- RLS policy: Authenticated users can upload logos into their user folder (user_id/*)
CREATE POLICY "Authenticated User Upload Business Logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policy: Authenticated users can update their uploaded logos
CREATE POLICY "Authenticated User Update Business Logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policy: Authenticated users can delete their uploaded logos
CREATE POLICY "Authenticated User Delete Business Logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );




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
  'a1111111-1111-1111-1111-111111111111'::uuid,
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
  'a2222222-2222-2222-2222-222222222222'::uuid,
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
  'a3333333-3333-3333-3333-333333333333'::uuid,
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
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Website Development',
  1.0,
  25000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'Domain & Hosting (1 Year)',
  1.0,
  5000.00,
  18.00
),
(
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'UI/UX Design System',
  1.0,
  15000.00,
  18.00
),

-- Items for Invoice 2 (INV-002)
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'E-commerce Platform Setup',
  1.0,
  40000.00,
  18.00
),
(
  'a2222222-2222-2222-2222-222222222222'::uuid,
  'Payment Gateway Integration',
  1.0,
  10000.00,
  18.00
),

-- Items for Invoice 3 (INV-003)
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Brand Strategy & Identity Guidelines',
  1.0,
  30000.00,
  18.00
),
(
  'a3333333-3333-3333-3333-333333333333'::uuid,
  'Social Media Asset Bundle',
  5.0,
  2000.00,
  18.00
);
-- =============================================================================
-- Migration: 20260808000010_add_invoice_status.sql
-- Description: Adds the status column to the invoices table with a CHECK constraint
--              allowing only 'draft', 'sent', and 'paid'. Defaults to 'draft'.
-- =============================================================================

ALTER TABLE public.invoices
  ADD COLUMN status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_valid CHECK (status IN ('draft', 'sent', 'paid'));

COMMENT ON COLUMN public.invoices.status IS
  'Invoice status. Must be one of: draft, sent, paid. Defaults to draft.';

-- Index for status queries
CREATE INDEX idx_invoices_business_id_status ON public.invoices(business_id, status);

