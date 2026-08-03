ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

COMMENT ON COLUMN public.estimates.signature_data_url IS
  'Customer signature captured as a compact PNG data URL during proposal acceptance.';
