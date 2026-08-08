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
