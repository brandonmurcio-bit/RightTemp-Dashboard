ALTER TABLE public.estimates
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.estimates
  DROP CONSTRAINT IF EXISTS estimates_status_check;

ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_status_check
  CHECK (status IN ('draft', 'sent', 'approved', 'won', 'rejected', 'expired'));

CREATE OR REPLACE FUNCTION public.convert_lead_to_customer(p_lead_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  lead_row public.leads%ROWTYPE;
  new_customer_id UUID;
  normalized_service_type TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO lead_row
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found or access denied';
  END IF;

  new_customer_id := lead_row.customer_id;

  IF new_customer_id IS NULL THEN
    normalized_service_type := CASE
      WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%install%'
        OR lower(coalesce(lead_row.service_type, '')) LIKE '%replace%' THEN 'hvac_install'
      WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%repair%'
        OR lower(coalesce(lead_row.service_type, '')) LIKE '%service%' THEN 'hvac_repair'
      WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%maint%'
        OR lower(coalesce(lead_row.service_type, '')) LIKE '%tune%' THEN 'maintenance'
      WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%inspect%' THEN 'inspection'
      WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%emerg%' THEN 'emergency'
      ELSE 'other'
    END;

    INSERT INTO public.customers (
      organization_id, name, email, phone, address, city, state, zip,
      status, service_type, source, notes
    ) VALUES (
      lead_row.organization_id, lead_row.name, lead_row.email, lead_row.phone,
      lead_row.address, lead_row.city, lead_row.state, lead_row.zip,
      'active', normalized_service_type, lead_row.source, lead_row.notes
    ) RETURNING id INTO new_customer_id;
  END IF;

  UPDATE public.leads
  SET customer_id = new_customer_id, status = 'won'
  WHERE id = lead_row.id;

  UPDATE public.estimates
  SET customer_id = new_customer_id,
      status = 'won',
      approved_at = COALESCE(approved_at, now())
  WHERE lead_id = lead_row.id
    AND organization_id = lead_row.organization_id
    AND status IN ('draft', 'sent', 'approved');

  RETURN new_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_customer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_customer(UUID) TO authenticated;
