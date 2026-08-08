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
