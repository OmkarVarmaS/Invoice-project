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
