-- =============================================================================
-- Migration: 20260808000006_enable_rls.sql
-- Description: Enables Row Level Security on all 5 application tables.
-- =============================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
