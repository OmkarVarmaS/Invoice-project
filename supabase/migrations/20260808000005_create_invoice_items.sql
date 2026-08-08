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
