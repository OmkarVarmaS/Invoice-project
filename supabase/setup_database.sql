-- =============================================================================
-- INVOICE GENERATOR SAAS — COMPLETE DATABASE SETUP (Schema + Triggers + Seed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper: updated_at timestamp trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Profiles Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  avatar_url  text        NULL,
  phone       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Businesses Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  logo_url         text        NULL,
  email            text        NULL,
  phone            text        NULL,
  address          text        NULL,
  gstin            text        NULL,
  default_currency text        NOT NULL DEFAULT 'USD',
  invoice_prefix   text        NOT NULL DEFAULT 'INV',
  invoice_counter  integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT businesses_user_id_unique UNIQUE (user_id),
  CONSTRAINT businesses_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT businesses_invoice_counter_non_negative CHECK (invoice_counter >= 0)
);

DROP TRIGGER IF EXISTS set_businesses_updated_at ON public.businesses;
CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Customers Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  email           text        NULL,
  phone           text        NULL,
  billing_address text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT customers_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Invoices Table & Sequential Number Generator
-- ---------------------------------------------------------------------------
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

  RETURN v_prefix || '-' || LPAD(v_counter::text, 3, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.invoices (
  id                   uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          uuid            NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id          uuid            NOT NULL REFERENCES public.customers(id)  ON DELETE RESTRICT,
  invoice_number       text            NOT NULL,
  status               text            NOT NULL DEFAULT 'draft',
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

  CONSTRAINT invoices_unique_number_per_business UNIQUE (business_id, invoice_number),
  CONSTRAINT invoices_status_valid CHECK (status IN ('draft', 'sent', 'paid')),
  CONSTRAINT invoices_due_date_after_invoice_date CHECK (due_date IS NULL OR due_date >= invoice_date),
  CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0),
  CONSTRAINT invoices_tax_amount_non_negative CHECK (tax_amount >= 0),
  CONSTRAINT invoices_discount_amount_non_negative CHECK (discount_amount >= 0),
  CONSTRAINT invoices_total_amount_non_negative CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id_status ON public.invoices(business_id, status);

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Invoice Items Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid            NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text            NOT NULL,
  quantity    numeric(10, 3)  NOT NULL DEFAULT 1,
  unit_price  numeric(12, 2)  NOT NULL DEFAULT 0,
  tax_rate    numeric(5, 2)   NOT NULL DEFAULT 0,
  line_amount numeric(12, 2)  NOT NULL DEFAULT 0,
  created_at  timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT invoice_items_description_not_empty CHECK (length(trim(description)) > 0),
  CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT invoice_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT invoice_items_tax_rate_range CHECK (tax_rate BETWEEN 0 AND 100),
  CONSTRAINT invoice_items_line_amount_non_negative CHECK (line_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- ---------------------------------------------------------------------------
-- 7. Automatic Calculation Triggers
-- ---------------------------------------------------------------------------
-- Item line amount: ROUND(quantity * unit_price, 2)
CREATE OR REPLACE FUNCTION public.calculate_invoice_item_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.line_amount := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_invoice_item_save_calculate ON public.invoice_items;
CREATE TRIGGER before_invoice_item_save_calculate
  BEFORE INSERT OR UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_item_totals();

-- Sync parent invoice totals on item insert/update/delete
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

  SELECT
    COALESCE(SUM(line_amount), 0),
    COALESCE(SUM(ROUND(line_amount * tax_rate / 100.0, 2)), 0)
  INTO v_subtotal, v_tax_amount
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  UPDATE public.invoices
  SET
    subtotal     = v_subtotal,
    tax_amount   = v_tax_amount,
    total_amount = GREATEST(0, v_subtotal + v_tax_amount - discount_amount),
    updated_at   = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_invoice_item_change_sync_totals ON public.invoice_items;
CREATE TRIGGER after_invoice_item_change_sync_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_totals();

-- Header total calculation when discount changes
CREATE OR REPLACE FUNCTION public.calculate_invoice_header_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_amount := GREATEST(0, NEW.subtotal + NEW.tax_amount - NEW.discount_amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_invoice_header_save_calculate ON public.invoices;
CREATE TRIGGER before_invoice_header_save_calculate
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_invoice_header_totals();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

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

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS businesses_select_own ON public.businesses;
DROP POLICY IF EXISTS businesses_insert_own ON public.businesses;
DROP POLICY IF EXISTS businesses_update_own ON public.businesses;
DROP POLICY IF EXISTS businesses_delete_own ON public.businesses;

CREATE POLICY businesses_select_own ON public.businesses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY businesses_insert_own ON public.businesses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY businesses_update_own ON public.businesses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY businesses_delete_own ON public.businesses FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customers_select_own ON public.customers;
DROP POLICY IF EXISTS customers_insert_own ON public.customers;
DROP POLICY IF EXISTS customers_update_own ON public.customers;
DROP POLICY IF EXISTS customers_delete_own ON public.customers;

CREATE POLICY customers_select_own ON public.customers FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY customers_insert_own ON public.customers FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id));
CREATE POLICY customers_update_own ON public.customers FOR UPDATE TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));
CREATE POLICY customers_delete_own ON public.customers FOR DELETE TO authenticated USING (public.owns_business(business_id));

-- Anonymous / Demo read access policies so testing frontend works seamlessly with public anon key
DROP POLICY IF EXISTS customers_anon_select ON public.customers;
CREATE POLICY customers_anon_select ON public.customers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS customers_anon_insert ON public.customers;
CREATE POLICY customers_anon_insert ON public.customers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS invoices_select_own ON public.invoices;
DROP POLICY IF EXISTS invoices_insert_own ON public.invoices;
DROP POLICY IF EXISTS invoices_update_own ON public.invoices;
DROP POLICY IF EXISTS invoices_delete_own ON public.invoices;

CREATE POLICY invoices_select_own ON public.invoices FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY invoices_insert_own ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.owns_business(business_id));
CREATE POLICY invoices_update_own ON public.invoices FOR UPDATE TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));
CREATE POLICY invoices_delete_own ON public.invoices FOR DELETE TO authenticated USING (public.owns_business(business_id));

-- Anonymous / Demo access policies for Invoices & Items
DROP POLICY IF EXISTS invoices_anon_all ON public.invoices;
CREATE POLICY invoices_anon_all ON public.invoices FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoice_items_select_own ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_insert_own ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_update_own ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_delete_own ON public.invoice_items;

CREATE POLICY invoice_items_select_own ON public.invoice_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)));
CREATE POLICY invoice_items_insert_own ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)));
CREATE POLICY invoice_items_update_own ON public.invoice_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.owns_business(inv.business_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)));
CREATE POLICY invoice_items_delete_own ON public.invoice_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices inv WHERE inv.id = invoice_id AND public.owns_business(inv.business_id)));

DROP POLICY IF EXISTS invoice_items_anon_all ON public.invoice_items;
CREATE POLICY invoice_items_anon_all ON public.invoice_items FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS businesses_anon_all ON public.businesses;
CREATE POLICY businesses_anon_all ON public.businesses FOR ALL TO anon USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- 9. Storage Setup for Business Logos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

