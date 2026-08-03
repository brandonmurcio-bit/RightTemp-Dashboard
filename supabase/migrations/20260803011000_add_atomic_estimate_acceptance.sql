CREATE OR REPLACE FUNCTION public.accept_estimate(
  p_estimate_id UUID,
  p_signed_by TEXT,
  p_signature_data_url TEXT
)
RETURNS TABLE(customer_id UUID, lead_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  estimate_row public.estimates%ROWTYPE;
  resolved_customer_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(trim(coalesce(p_signed_by, ''))) < 2 THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF p_signature_data_url IS NULL
     OR p_signature_data_url NOT LIKE 'data:image/png;base64,%'
     OR length(p_signature_data_url) > 1000000 THEN
    RAISE EXCEPTION 'A valid customer signature is required';
  END IF;

  SELECT * INTO estimate_row
  FROM public.estimates
  WHERE id = p_estimate_id
    AND public.is_org_member(organization_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found or access denied';
  END IF;
  IF estimate_row.status IN ('won', 'approved') THEN
    RAISE EXCEPTION 'Estimate has already been accepted';
  END IF;
  IF estimate_row.status IN ('rejected', 'expired') THEN
    RAISE EXCEPTION 'Rejected or expired estimates cannot be accepted';
  END IF;

  resolved_customer_id := estimate_row.customer_id;
  IF estimate_row.lead_id IS NOT NULL THEN
    resolved_customer_id := public.convert_lead_to_customer(estimate_row.lead_id);
  END IF;
  IF resolved_customer_id IS NULL THEN
    RAISE EXCEPTION 'Estimate is not linked to a lead or customer';
  END IF;

  UPDATE public.estimates
  SET customer_id = resolved_customer_id,
      status = CASE WHEN estimate_row.lead_id IS NULL THEN 'approved' ELSE 'won' END,
      approved_at = now(),
      signed_at = now(),
      signed_by = trim(p_signed_by),
      signature_data_url = p_signature_data_url,
      rejected_at = NULL
  WHERE id = estimate_row.id;

  RETURN QUERY SELECT resolved_customer_id, estimate_row.lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_estimate(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_estimate(UUID, TEXT, TEXT) TO authenticated;
