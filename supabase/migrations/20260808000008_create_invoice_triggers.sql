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
