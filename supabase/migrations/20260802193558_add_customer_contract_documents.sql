CREATE TABLE public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'contract'
    CHECK (document_type IN ('contract', 'proposal', 'warranty', 'permit', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_documents_customer_id
  ON public.customer_documents(customer_id);
CREATE INDEX idx_customer_documents_org_id
  ON public.customer_documents(organization_id);
CREATE INDEX idx_customer_documents_uploaded_by
  ON public.customer_documents(uploaded_by);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read customer documents"
  ON public.customer_documents FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));

CREATE POLICY "Org members can upload customer documents"
  ON public.customer_documents FOR INSERT TO authenticated
  WITH CHECK (
    private.is_org_member(organization_id)
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "Org admins can delete customer documents"
  ON public.customer_documents FOR DELETE TO authenticated
  USING (private.is_org_role(organization_id, 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-documents',
  'customer-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Org members can read customer storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE POLICY "Org members can upload customer storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE POLICY "Org admins can delete customer storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND private.is_org_role(public.storage_org_id(name), 'admin')
  );
