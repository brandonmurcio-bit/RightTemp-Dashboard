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
--   the is_org_member() helper. Multi-tenant by design.
--
-- Audit fixes applied (all in this single file):
--   FIX-1  set_updated_at / sync_job_cost_total — added SET search_path = public
--          (Supabase security advisor requirement for all functions)
--   FIX-2  is_org_member / is_org_role — LANGUAGE sql functions validate table
--          references at CREATE time; moved to AFTER organization_members table
--   FIX-3  organizations RLS policies — moved to AFTER helper functions exist
--   FIX-4  organization_members SELECT policy — replaced inline self-referencing
--          subquery (infinite recursion) with get_my_org_ids() SECURITY DEFINER
--   FIX-5  organization_members INSERT policy — replaced inline NOT EXISTS
--          self-referencing subquery (infinite recursion) with org_has_no_members()
--          SECURITY DEFINER
--   FIX-6  Storage policies — replaced hard (string_to_array(name,'/'))[1]::uuid
--          cast (throws on any non-UUID path segment) with storage_org_id() helper
--          that regex-guards before casting and returns NULL on mismatch
--
-- Notes:
--   gen_random_uuid() — built-in since Postgres 13; no extension needed on PG15
--   profiles DELETE — intentionally no policy; row is removed via ON DELETE CASCADE
--     from auth.users, not by direct DELETE from application code
--   job_costs triggers — trg_job_costs_sync_total fires before trg_job_costs_updated_at
--     (alphabetical BEFORE-trigger order); total_cost is computed first, then
--     updated_at is stamped — correct order
-- =============================================================================


-- ===========================================================================
-- SECTION 1: UTILITY TRIGGER FUNCTIONS
-- No table references — safe to define first.
-- All have SET search_path = public (FIX-1).
-- ===========================================================================

-- Stamps updated_at on every row mutation.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public                          -- FIX-1
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-computes job_costs.total_cost = quantity * unit_cost.
CREATE OR REPLACE FUNCTION public.sync_job_cost_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public                          -- FIX-1
AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

-- Safely extracts the organization UUID from a storage object path.
-- Path convention: {org_id}/{job_id}/{uuid}-{filename}
-- Returns NULL (never throws) when the first segment is not a valid UUID.
-- Used by all storage.objects policies (FIX-6).
CREATE OR REPLACE FUNCTION public.storage_org_id(obj_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
SET search_path = public                          -- FIX-1
AS $$
  SELECT CASE
    WHEN split_part(obj_name, '/', 1) ~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN split_part(obj_name, '/', 1)::uuid
    ELSE NULL
  END;
$$;

-- Auto-creates a profiles row when a Supabase Auth user signs up.
-- LANGUAGE plpgsql: body is lazy-validated — safe to define before profiles table.
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


-- ===========================================================================
-- SECTION 2: ORGANIZATIONS
-- Created without RLS policies — policies are added in Section 6 after the
-- helper functions that they reference have been defined (FIX-3).
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

-- RLS is enabled here; policies are added in Section 6.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- SECTION 3: PROFILES
-- One row per Supabase Auth user. Created via handle_new_user() trigger.
-- RLS policies are added in Section 6 (after helper functions).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID  PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  job_title   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fire handle_new_user() whenever a new Supabase Auth user is created.
CREATE TRIGGER trg_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS is enabled here; policies are added in Section 6.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- SECTION 4: ORGANIZATION MEMBERS
-- Joins users to organizations with a role.
-- Must exist before the LANGUAGE sql helper functions are defined (FIX-2).
-- RLS policies are added in Section 6 (after helper functions).
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

-- RLS is enabled here; policies are added in Section 6.
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- SECTION 5: ORGANIZATION HELPER FUNCTIONS
-- Defined HERE — after organization_members exists — because LANGUAGE sql
-- functions validate table references at CREATE time (FIX-2).
-- All are SECURITY DEFINER so they bypass RLS on organization_members,
-- preventing infinite recursion when called from RLS policies (FIX-4, FIX-5).
-- ===========================================================================

-- Returns TRUE when auth.uid() is a member of the given organization.
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

-- Returns TRUE when auth.uid() holds at least min_role in the given org.
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

-- Returns the set of organization_ids that auth.uid() belongs to.
-- Used by the organization_members SELECT policy (FIX-4).
-- SECURITY DEFINER reads organization_members without triggering its own RLS,
-- breaking the otherwise-infinite recursion.
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.organization_members
  WHERE  user_id = auth.uid();
$$;

-- Returns TRUE when no member rows exist yet for the given organization.
-- Used by the organization_members INSERT policy (FIX-5).
-- SECURITY DEFINER reads organization_members without triggering its own RLS.
CREATE OR REPLACE FUNCTION public.org_has_no_members(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM   public.organization_members
    WHERE  organization_id = org_id
  );
$$;


-- ===========================================================================
-- SECTION 6: RLS POLICIES
-- All helper functions now exist — safe to create policies (FIX-3).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

-- Members can read their own organization.
CREATE POLICY "Org members can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_org_member(id));

-- Any authenticated user can create a new organization (onboarding flow).
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins and owners can update org settings.
CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING  (public.is_org_role(id, 'admin'))
  WITH CHECK (public.is_org_role(id, 'admin'));

-- Only owners can delete (destructive — rare).
CREATE POLICY "Org owners can delete their organization"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_org_role(id, 'owner'));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- All authenticated users can see profiles (member directories, @mentions).
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own profile (also handled by trigger; policy covers manual upserts).
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile.
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy: application code never deletes profiles directly.
-- Deletion is handled by ON DELETE CASCADE from auth.users.

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

-- Members can see all membership rows for organizations they belong to.
-- Uses get_my_org_ids() (SECURITY DEFINER) to avoid reading organization_members
-- inside its own RLS policy, which would cause infinite recursion (FIX-4).
CREATE POLICY "Org members can view all members of their org"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT public.get_my_org_ids()));

-- Admins can add new members; a user can add themselves as owner when the org
-- is brand new (no existing members). org_has_no_members() is SECURITY DEFINER
-- to avoid reading organization_members inside its own INSERT policy (FIX-5).
CREATE POLICY "Org admins can insert members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_role(organization_id, 'admin')
    OR public.org_has_no_members(organization_id)
  );

-- Admins can change member roles.
CREATE POLICY "Org admins can update member roles"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING  (public.is_org_role(organization_id, 'admin'))
  WITH CHECK (public.is_org_role(organization_id, 'admin'));

-- Admins can remove members; any member can remove themselves.
CREATE POLICY "Org admins can remove members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    public.is_org_role(organization_id, 'admin')
    OR user_id = auth.uid()
  );


-- ===========================================================================
-- SECTION 7: BUSINESS TABLES
-- Each table: CREATE TABLE → trigger(s) → indexes → RLS enable → RLS policies
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- JOBS
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_jobs_org_id           ON public.jobs (organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id      ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id          ON public.jobs (lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status           ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start  ON public.jobs (scheduled_start);

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


-- ---------------------------------------------------------------------------
-- ESTIMATES
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- PAYMENTS  (formerly: receipts)
-- Invoices / payment records issued after a job is complete.
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- JOB COSTS
-- Internal cost line items — not shown to customers.
-- Two BEFORE triggers fire in alphabetical order:
--   trg_job_costs_sync_total  → computes total_cost first
--   trg_job_costs_updated_at  → stamps updated_at second  ✓
-- ---------------------------------------------------------------------------

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
  -- total_cost is auto-computed by trg_job_costs_sync_total; do not set manually

  notes            TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fires first (alphabetically before trg_job_costs_updated_at)
CREATE TRIGGER trg_job_costs_sync_total
  BEFORE INSERT OR UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_cost_total();

-- Fires second
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


-- ---------------------------------------------------------------------------
-- JOB DOCUMENTS
-- Metadata for files stored in Supabase Storage (bucket: job-documents).
-- Covers vendor receipts, equipment invoices, permits, warranties,
-- signed estimates, and before/after photos.
-- ---------------------------------------------------------------------------

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

  -- Storage reference
  file_name        TEXT  NOT NULL,   -- original filename, e.g. "invoice-hvac-unit.pdf"
  storage_path     TEXT  NOT NULL,   -- path inside job-documents bucket
                                     -- convention: {org_id}/{job_id}/{uuid}-{file_name}

  -- Financial metadata (optional — primarily for vendor_receipt / equipment_invoice)
  amount           NUMERIC(12,2),    -- dollar value, if applicable
  vendor           TEXT,             -- supplier or contractor name

  document_date    DATE,             -- date on the document (invoice date, permit date, etc.)

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
-- SECTION 8: STORAGE — Private bucket: job-documents
--
-- Path convention inside the bucket:
--   {organization_id}/{job_id}/{uuid}-{original_filename}
--
-- storage_org_id(name) extracts the first path segment and validates it as a
-- UUID before casting. It returns NULL for any malformed path, which causes
-- is_org_member(NULL) / is_org_role(NULL, ...) to return false safely —
-- no errors thrown, no storage access granted (FIX-6).
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

-- SELECT — org members can download files belonging to their organization.
CREATE POLICY "Org members can read job documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_member(public.storage_org_id(name))   -- FIX-6
  );

-- INSERT — org members can upload into their organization's folder.
CREATE POLICY "Org members can upload job documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-documents'
    AND public.is_org_member(public.storage_org_id(name))   -- FIX-6
  );

-- UPDATE — org members can replace files they can already read.
CREATE POLICY "Org members can update job documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_member(public.storage_org_id(name))   -- FIX-6
  )
  WITH CHECK (
    bucket_id = 'job-documents'
    AND public.is_org_member(public.storage_org_id(name))   -- FIX-6
  );

-- DELETE — only org admins/owners can permanently remove files.
CREATE POLICY "Org admins can delete job documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-documents'
    AND public.is_org_role(public.storage_org_id(name), 'admin')   -- FIX-6
  );


-- ===========================================================================
-- END OF MIGRATION
-- ===========================================================================
