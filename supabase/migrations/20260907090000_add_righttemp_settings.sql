-- RightTemp OS settings
-- Personal preferences are user-owned. Branding and branding assets are
-- organization-owned and writable only by organization admins/owners.

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(preferences) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE public.organization_branding (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'RightTemp Heating & Air Conditioning',
  app_mark TEXT NOT NULL DEFAULT 'RT'
    CHECK (char_length(app_mark) BETWEEN 1 AND 4),
  logo_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1565E8'
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#ED1C24'
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color TEXT NOT NULL DEFAULT '#070707'
    CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color TEXT NOT NULL DEFAULT '#F5F5F5'
    CHECK (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organization_branding_updated_at
  BEFORE UPDATE ON public.organization_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.organization_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view organization branding"
  ON public.organization_branding FOR SELECT TO authenticated
  USING (private.is_org_member(organization_id));

CREATE POLICY "Org admins can create organization branding"
  ON public.organization_branding FOR INSERT TO authenticated
  WITH CHECK (private.is_org_role(organization_id, 'admin'));

CREATE POLICY "Org admins can update organization branding"
  ON public.organization_branding FOR UPDATE TO authenticated
  USING (private.is_org_role(organization_id, 'admin'))
  WITH CHECK (private.is_org_role(organization_id, 'admin'));

CREATE POLICY "Org admins can delete organization branding"
  ON public.organization_branding FOR DELETE TO authenticated
  USING (private.is_org_role(organization_id, 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-branding',
  'organization-branding',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Org members can read branding assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'organization-branding'
    AND private.is_org_member(public.storage_org_id(name))
  );

CREATE POLICY "Org admins can upload branding assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-branding'
    AND private.is_org_role(public.storage_org_id(name), 'admin')
  );

CREATE POLICY "Org admins can replace branding assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-branding'
    AND private.is_org_role(public.storage_org_id(name), 'admin')
  )
  WITH CHECK (
    bucket_id = 'organization-branding'
    AND private.is_org_role(public.storage_org_id(name), 'admin')
  );

CREATE POLICY "Org admins can delete branding assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-branding'
    AND private.is_org_role(public.storage_org_id(name), 'admin')
  );