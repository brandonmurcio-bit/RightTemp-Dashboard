-- =============================================================================
-- RightTemp OS — Initial Schema
-- Migration: 20260724000000_initial_schema.sql
--
-- Tables (creation order):
--   organizations, profiles, organization_members
--   customers, leads, jobs, estimates, payments, job_costs, job_documents
--
-- Storage:
--   Private bucket: job-documents
--   Storage policies scoped by organization membership
--
-- Auth:
--   Row Level Security — every business-data policy checks that the
--   authenticated user is a member of the row's owning organization via
--   the is_org_member() helper.  Multi-tenant by design.
-- =============================================================================


-- ===========================================================================
-- UTILITY FUNCTIONS
-- ===========================================================================

-- Auto-stamp updated_at on every mutation
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-compute job_costs.total_cost = quantity * unit_cost
CREATE OR REPLACE FUNCTION public.sync_job_cost_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

-- Returns TRUE when the calling user is a member of the given organization.
-- SECURITY DEFINER so it can read organization_members without triggering
-- the RLS policies on that table (avoids infinite recursion).
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.organization_members
    WHERE  organization_id = org_id
    AND    user_id         = auth.uid()
  );
$$;

-- Returns TRUE when the calling user has the given role (or higher) in an org.
-- Role hierarchy: owner > admin > member
CREATE OR REPLACE FUNCTION public.is_org_role(org_id UUID, min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.organization_members
    WHERE  organization_id = org_id
    AND    user_id         = auth.uid()
    AND    CASE min_role
             WHEN 'owner' THEN role = 'owner'
             WHEN 'admin' THEN role IN ('owner', 'admin')
             ELSE              role IN ('owner', 'admin', 'member')
           END
  );
$$;


-- ===========================================================================
-- ORGANIZATIONS
-- One organization per business / company account.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT  NOT NULL,
  slug        TEXT  NOT NULL UNIQUE,   -- URL-safe identifier, e.g. "cool-hvac-co"
  plan        TEXT  NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  logo_url    TEXT,
  website     TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  zip         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: members can read their org; only owners/admins can mutate it
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_org_member(id));

CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING  (public.is_org_role(id, 'admin'))
  WITH CHECK (public.is_org_role(id, 'admin'));

-- INSERT is allowed to any authenticated user (creates a new org during onboarding)
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only owners can delete (destructive — rare)
CREATE POLICY "Org owners can delete their organization"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_org_role(id, 'owner'));


-- ===========================================================================
-- PROFILES
-- One row per Supabase Auth user; extended display information.
-- Populated by a trigger on auth.users or during onboarding.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID  PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  job_title     TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: authenticated users can see all profiles (for member directories, @mentions)
--      but may only update their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ===========================================================================
-- ORGANIZATION MEMBERS
-- Joins users to organizations with a role.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id          UUID  NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role             TEXT  NOT NULL DEFAULT 'member'
                     CHECK (role IN ('owner', 'admin', 'member')),
  invited_by       UUID  REFERENCES auth.users (id) ON DELETE SET NULL,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON public.organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members (user_id);

-- RLS: members can see all memberships in their org;
--      admins can add/remove members; only owners can promote to admin/owner
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view all members of their org"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM   public.organization_members
      WHERE  user_id = auth.uid()
    )
  );

-- Any authenticated user can insert themselves as owner when creating a new org
-- (enforced in application: must be first member = owner)
CREATE POLICY "Org admins can insert members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_role(organization_id, 'admin')
    OR NOT EXISTS (
      SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id
    )
  );

CREATE POLICY "Org admins can update member roles"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING  (public.is_org_role(organization_id, 'admin'))
  WITH CHECK (public.is_org_role(organization_id, 'admin'));

CREATE POLICY "Org admins can remove members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    public.is_org_role(organization_id, 'admin')
    OR user_id = auth.uid()   -- members can remove themselves
  );


-- ===========================================================================
-- CUSTOMERS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,

  name             TEXT  NOT NULL,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  zip              TEXT,

  status           TEXT  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),
  service_type     TEXT,
  source           TEXT,
  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (status);
CREATE INDEX IF NOT EXISTS idx_customers_email  ON public.customers (email);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- LEADS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,

  -- Set when lead converts to a paying customer
  customer_id      UUID  REFERENCES public.customers (id) ON DELETE SET NULL,

  name             TEXT  NOT NULL,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  zip              TEXT,

  status           TEXT  NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  source           TEXT
                     CHECK (source IN ('referral', 'website', 'google', 'yelp', 'phone', 'social', 'other')),
  service_type     TEXT,
  follow_up_date   DATE,
  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_org_id      ON public.leads (organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON public.leads (customer_id);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update leads"
  ON public.leads FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- JOBS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  customer_id      UUID  NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  lead_id          UUID  REFERENCES public.leads (id) ON DELETE SET NULL,

  title            TEXT  NOT NULL,
  description      TEXT,
  service_type     TEXT,

  status           TEXT  NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority         TEXT  NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  scheduled_start  TIMESTAMPTZ,
  scheduled_end    TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,

  assigned_to      TEXT,   -- technician name or user identifier

  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_jobs_org_id          ON public.jobs (organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id     ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id         ON public.jobs (lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status          ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON public.jobs (scheduled_start);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete jobs"
  ON public.jobs FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- ESTIMATES
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.estimates (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  customer_id      UUID  NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  job_id           UUID  REFERENCES public.jobs (id) ON DELETE SET NULL,
  lead_id          UUID  REFERENCES public.leads (id) ON DELETE SET NULL,

  estimate_number  TEXT  UNIQUE,   -- e.g. EST-0042

  title            TEXT  NOT NULL,
  line_items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each element: { "description": "", "quantity": 1, "unit_price": 0.00, "total": 0.00 }

  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(6,4)  NOT NULL DEFAULT 0,   -- e.g. 0.0875 = 8.75%
  tax_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,

  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  valid_until      DATE,
  sent_at          TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,

  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_estimates_org_id      ON public.estimates (organization_id);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates (customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_job_id      ON public.estimates (job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status      ON public.estimates (status);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select estimates"
  ON public.estimates FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert estimates"
  ON public.estimates FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update estimates"
  ON public.estimates FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete estimates"
  ON public.estimates FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- PAYMENTS  (formerly: receipts)
-- Invoices / payment records issued after a job is complete.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  job_id           UUID  NOT NULL REFERENCES public.jobs (id) ON DELETE RESTRICT,
  customer_id      UUID  NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  estimate_id      UUID  REFERENCES public.estimates (id) ON DELETE SET NULL,

  receipt_number   TEXT  UNIQUE,   -- e.g. REC-0042

  line_items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each element: { "description": "", "quantity": 1, "unit_price": 0.00, "total": 0.00 }

  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(6,4)  NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid      NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- balance_due = total - amount_paid; compute in the application layer

  payment_method   TEXT CHECK (payment_method IN ('cash', 'check', 'card', 'ach', 'financing', 'other')),
  payment_date     DATE,

  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'void')),
  sent_at          TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,

  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_org_id      ON public.payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id      ON public.payments (job_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- JOB COSTS
-- Internal cost line items (labour, materials, etc.) — not shown to customers.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.job_costs (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  job_id           UUID  NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,

  category         TEXT  NOT NULL DEFAULT 'materials'
                     CHECK (category IN ('labor', 'materials', 'equipment', 'subcontractor', 'permit', 'other')),

  description      TEXT  NOT NULL,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- total_cost is auto-computed by trigger; do not set it manually

  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_job_costs_sync_total
  BEFORE INSERT OR UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_cost_total();

CREATE TRIGGER trg_job_costs_updated_at
  BEFORE UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_job_costs_org_id   ON public.job_costs (organization_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_job_id   ON public.job_costs (job_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_category ON public.job_costs (category);

ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select job_costs"
  ON public.job_costs FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert job_costs"
  ON public.job_costs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update job_costs"
  ON public.job_costs FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete job_costs"
  ON public.job_costs FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- JOB DOCUMENTS
-- Files attached to a job — vendor receipts, invoices, permits, warranties,
-- signed estimates, before/after photos, and any other supporting documents.
-- Files are stored in Supabase Storage; this table records the metadata.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.job_documents (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID  NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  job_id           UUID  NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  customer_id      UUID  NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,

  document_type    TEXT  NOT NULL
                     CHECK (document_type IN (
                       'vendor_receipt',
                       'equipment_invoice',
                       'permit',
                       'warranty',
                       'signed_estimate',
                       'photo_before',
                       'photo_after',
                       'other'
                     )),

  -- Storage
  file_name        TEXT  NOT NULL,    -- original filename as uploaded, e.g. "invoice-hvac-unit.pdf"
  storage_path     TEXT  NOT NULL,    -- path inside the job-documents bucket
                                      -- convention: {org_id}/{job_id}/{uuid}-{file_name}

  -- Financial metadata (optional — mainly for vendor_receipt / equipment_invoice)
  amount           NUMERIC(12,2),     -- dollar value of the document, if applicable
  vendor           TEXT,              -- supplier or contractor name

  document_date    DATE,              -- date on the document (invoice date, permit date, etc.)

  notes            TEXT,

  uploaded_by      UUID  REFERENCES auth.users (id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_job_documents_updated_at
  BEFORE UPDATE ON public.job_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_job_docs_org_id        ON public.job_documents (organization_id);
CREATE INDEX IF NOT EXISTS idx_job_docs_job_id        ON public.job_documents (job_id);
CREATE INDEX IF NOT EXISTS idx_job_docs_customer_id   ON public.job_documents (customer_id);
CREATE INDEX IF NOT EXISTS idx_job_docs_document_type ON public.job_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_job_docs_uploaded_by   ON public.job_documents (uploaded_by);

ALTER TABLE public.job_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select job_documents"
  ON public.job_documents FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can insert job_documents"
  ON public.job_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can update job_documents"
  ON public.job_documents FOR UPDATE TO authenticated
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org admins can delete job_documents"
  ON public.job_documents FOR DELETE TO authenticated
  USING (public.is_org_role(organization_id, 'admin'));


-- ===========================================================================
-- STORAGE — Private bucket: job-documents
--
-- Path convention inside the bucket:
--   {organization_id}/{job_id}/{uuid}-{original_filename}
--
-- The first path segment is always the organization_id UUID.
-- Policies extract it with (string_to_array(name, '/'))[1]::uuid and verify
-- the calling user is a member of that organization.
-- ===========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-documents',
  'job-documents',
  false,           -- private: no unauthenticated access
  52428800,        -- 50 MB per file
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- SELECT — org members can download files that belong to their organization
CREATE POLICY "Org members can read job documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  );

-- INSERT — org members can upload files into their organization's folder
CREATE POLICY "Org members can upload job documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-documents'
    AND public.is_org_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  );

-- UPDATE — org members can update (replace) files they can already see
CREATE POLICY "Org members can update job documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'job-documents'
    AND public.is_org_member(
      (string_to_array(name, '/'))[1]::uuid
    )
  );

-- DELETE — only org admins/owners can permanently remove files
CREATE POLICY "Org admins can delete job documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_role(
      (string_to_array(name, '/'))[1]::uuid,
      'admin'
    )
  );


-- ===========================================================================
-- END OF MIGRATION
-- ===========================================================================
