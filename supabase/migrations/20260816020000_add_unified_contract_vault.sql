CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'presented', 'signed')),
  signed_by TEXT,
  signature_data_url TEXT,
  signed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'signed') = (signed_at IS NOT NULL))
);
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read contract documents" ON public.contract_documents FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY "Org members can upload contract documents" ON public.contract_documents FOR INSERT TO authenticated WITH CHECK (private.is_org_member(organization_id) AND uploaded_by = (SELECT auth.uid()));
CREATE POLICY "Contract owners can update contract documents" ON public.contract_documents FOR UPDATE TO authenticated
  USING (uploaded_by = (SELECT auth.uid()) OR private.is_org_role(organization_id, 'admin'))
  WITH CHECK (uploaded_by = (SELECT auth.uid()) OR private.is_org_role(organization_id, 'admin'));
CREATE POLICY "Org admins can delete contract documents" ON public.contract_documents FOR DELETE TO authenticated USING (private.is_org_role(organization_id, 'admin'));
CREATE INDEX IF NOT EXISTS idx_contract_documents_estimate ON public.contract_documents(estimate_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_customer ON public.contract_documents(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_documents_job ON public.contract_documents(job_id) WHERE job_id IS NOT NULL;
CREATE OR REPLACE FUNCTION private.protect_signed_contract_document() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF OLD.signed_at IS NOT NULL AND (
    NEW.file_name IS DISTINCT FROM OLD.file_name OR NEW.storage_path IS DISTINCT FROM OLD.storage_path OR
    NEW.status IS DISTINCT FROM OLD.status OR NEW.signed_by IS DISTINCT FROM OLD.signed_by OR
    NEW.signature_data_url IS DISTINCT FROM OLD.signature_data_url OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
  ) THEN RAISE EXCEPTION 'Signed contract content is immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_signed_contract_document BEFORE UPDATE ON public.contract_documents FOR EACH ROW EXECUTE FUNCTION private.protect_signed_contract_document();
CREATE TRIGGER trg_contract_documents_updated_at BEFORE UPDATE ON public.contract_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
