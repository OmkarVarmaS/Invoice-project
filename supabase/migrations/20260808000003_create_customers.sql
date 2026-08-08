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
