CREATE TABLE public.estimate_walkthrough_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  file_size BIGINT,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estimate_walkthrough_photos_estimate_id
  ON public.estimate_walkthrough_photos(estimate_id);
CREATE INDEX idx_estimate_walkthrough_photos_org_id
  ON public.estimate_walkthrough_photos(organization_id);
CREATE INDEX idx_estimate_walkthrough_photos_uploaded_by
  ON public.estimate_walkthrough_photos(uploaded_by);

ALTER TABLE public.estimate_walkthrough_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read estimate walkthrough photos"
  ON public.estimate_walkthrough_photos FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));

CREATE POLICY "Org members can upload estimate walkthrough photos"
  ON public.estimate_walkthrough_photos FOR INSERT TO authenticated
  WITH CHECK (
    private.is_org_member(organization_id)
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "Org members can delete estimate walkthrough photos"
  ON public.estimate_walkthrough_photos FOR DELETE TO authenticated
  USING (private.is_org_member(organization_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'estimate-walkthroughs',
  'estimate-walkthroughs',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Org members can read estimate walkthrough storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'estimate-walkthroughs'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE POLICY "Org members can upload estimate walkthrough storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'estimate-walkthroughs'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE POLICY "Org members can delete estimate walkthrough storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'estimate-walkthroughs'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE OR REPLACE FUNCTION private.link_won_estimate_to_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.estimates
  SET job_id = NEW.id
  WHERE id = (
    SELECT e.id
    FROM public.estimates e
    WHERE e.organization_id = NEW.organization_id
      AND e.customer_id = NEW.customer_id
      AND e.status = 'won'
      AND e.job_id IS NULL
    ORDER BY e.updated_at DESC, e.created_at DESC
    LIMIT 1
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jobs_link_won_estimate
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION private.link_won_estimate_to_new_job();
