-- Record proposal fields that already exist in production and add an atomic,
-- idempotent lead-to-customer conversion RPC.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS estimate_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS equipment TEXT,
  ADD COLUMN IF NOT EXISTS scope_of_work TEXT;

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

  SELECT *
  INTO lead_row
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found or access denied';
  END IF;

  IF lead_row.customer_id IS NOT NULL THEN
    RETURN lead_row.customer_id;
  END IF;

  normalized_service_type := CASE
    WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%install%'
      OR lower(coalesce(lead_row.service_type, '')) LIKE '%replace%'
      THEN 'hvac_install'
    WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%repair%'
      OR lower(coalesce(lead_row.service_type, '')) LIKE '%service%'
      THEN 'hvac_repair'
    WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%maint%'
      OR lower(coalesce(lead_row.service_type, '')) LIKE '%tune%'
      THEN 'maintenance'
    WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%inspect%'
      THEN 'inspection'
    WHEN lower(coalesce(lead_row.service_type, '')) LIKE '%emerg%'
      THEN 'emergency'
    ELSE 'other'
  END;

  INSERT INTO public.customers (
    organization_id,
    name,
    email,
    phone,
    address,
    city,
    state,
    zip,
    status,
    service_type,
    source,
    notes
  )
  VALUES (
    lead_row.organization_id,
    lead_row.name,
    lead_row.email,
    lead_row.phone,
    lead_row.address,
    lead_row.city,
    lead_row.state,
    lead_row.zip,
    'active',
    normalized_service_type,
    lead_row.source,
    lead_row.notes
  )
  RETURNING id INTO new_customer_id;

  UPDATE public.leads
  SET customer_id = new_customer_id,
      status = 'won'
  WHERE id = lead_row.id;

  RETURN new_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_customer(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_lead_to_customer(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_customer(UUID) TO authenticated;
