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
