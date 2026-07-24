-- =============================================================================
-- RightTemp OS — Initial Schema
-- Migration: 20260724000000_initial_schema.sql
--
-- Tables:  customers, leads, jobs, estimates, receipts, job_costs
-- Auth:    Row Level Security — authenticated users have full access
--          (single-tenant business app; all staff share one Supabase project)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at on every row mutation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ===========================================================================
-- CUSTOMERS
-- Core entity — every job, estimate, and receipt belongs to a customer.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name            TEXT          NOT NULL,
  email           TEXT,
  phone           TEXT,

  -- Address
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,

  -- Business metadata
  status          TEXT          NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  service_type    TEXT,                        -- e.g. 'HVAC', 'Plumbing'
  source          TEXT,                        -- how they found the business
  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (status);
CREATE INDEX IF NOT EXISTS idx_customers_email  ON public.customers (email);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- LEADS
-- Prospective customers moving through a sales pipeline.
-- May optionally be linked to a customer record once converted.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional: set when the lead converts to a paying customer
  customer_id     UUID          REFERENCES public.customers (id)
                                  ON DELETE SET NULL,

  -- Contact info (duplicated from customer intentionally — leads aren't customers yet)
  name            TEXT          NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,

  -- Pipeline stage
  status          TEXT          NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),

  -- Acquisition
  source          TEXT
                    CHECK (source IN ('referral', 'website', 'google', 'yelp', 'phone', 'social', 'other')),
  service_type    TEXT,

  -- Scheduling / follow-up
  follow_up_date  DATE,

  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status      ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON public.leads (customer_id);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- JOBS
-- A unit of work assigned to a customer, optionally converted from a lead.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  customer_id     UUID          NOT NULL REFERENCES public.customers (id)
                                  ON DELETE RESTRICT,
  lead_id         UUID          REFERENCES public.leads (id)
                                  ON DELETE SET NULL,

  -- Description
  title           TEXT          NOT NULL,
  description     TEXT,
  service_type    TEXT,

  -- Workflow
  status          TEXT          NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority        TEXT          NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Scheduling
  scheduled_start TIMESTAMPTZ,
  scheduled_end   TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  -- Assignment
  assigned_to     TEXT,                        -- technician name or user identifier

  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id    ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id        ON public.jobs (lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status         ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON public.jobs (scheduled_start);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- ESTIMATES
-- Price quotes sent to a customer before a job begins.
-- May be linked to a lead (pre-conversion) or an existing job.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.estimates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  customer_id     UUID          NOT NULL REFERENCES public.customers (id)
                                  ON DELETE RESTRICT,
  job_id          UUID          REFERENCES public.jobs (id)
                                  ON DELETE SET NULL,
  lead_id         UUID          REFERENCES public.leads (id)
                                  ON DELETE SET NULL,

  -- Human-readable identifier (e.g. EST-0042)
  estimate_number TEXT          UNIQUE,

  -- Content
  title           TEXT          NOT NULL,
  line_items      JSONB         NOT NULL DEFAULT '[]'::jsonb,
                                -- Array of { description, quantity, unit_price, total }

  -- Financials (denormalised for quick display; recompute from line_items on save)
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(6,4)  NOT NULL DEFAULT 0,  -- e.g. 0.0875 = 8.75 %
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Workflow
  status          TEXT          NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  valid_until     DATE,
  sent_at         TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,

  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates (customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_job_id      ON public.estimates (job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status      ON public.estimates (status);

-- RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select estimates"
  ON public.estimates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert estimates"
  ON public.estimates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update estimates"
  ON public.estimates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete estimates"
  ON public.estimates FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- RECEIPTS
-- Invoices / payment records issued after a job is complete.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.receipts (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  job_id          UUID          NOT NULL REFERENCES public.jobs (id)
                                  ON DELETE RESTRICT,
  customer_id     UUID          NOT NULL REFERENCES public.customers (id)
                                  ON DELETE RESTRICT,
  estimate_id     UUID          REFERENCES public.estimates (id)
                                  ON DELETE SET NULL,

  -- Human-readable identifier (e.g. REC-0042)
  receipt_number  TEXT          UNIQUE,

  -- Content (mirrors estimate structure)
  line_items      JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- Financials
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(6,4)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- balance_due = total - amount_paid (compute in application layer)

  -- Payment
  payment_method  TEXT
                    CHECK (payment_method IN ('cash', 'check', 'card', 'ach', 'financing', 'other')),
  payment_date    DATE,

  -- Workflow
  status          TEXT          NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'void')),
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,

  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_job_id      ON public.receipts (job_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON public.receipts (customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status      ON public.receipts (status);

-- RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select receipts"
  ON public.receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert receipts"
  ON public.receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update receipts"
  ON public.receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipts"
  ON public.receipts FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- JOB COSTS
-- Internal cost line items tracked against a job (labour, parts, etc.).
-- Used for profitability reporting — not shown to customers.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.job_costs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  job_id          UUID          NOT NULL REFERENCES public.jobs (id)
                                  ON DELETE CASCADE,

  -- Classification
  category        TEXT          NOT NULL DEFAULT 'materials'
                    CHECK (category IN ('labor', 'materials', 'equipment', 'subcontractor', 'permit', 'other')),

  -- Line item
  description     TEXT          NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost      NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Keep total_cost as a plain column; set it = quantity * unit_cost in the application
  -- or via the trigger below so reporting queries stay simple.

  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-compute total_cost from quantity * unit_cost on insert/update
CREATE OR REPLACE FUNCTION public.sync_job_cost_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_costs_sync_total
  BEFORE INSERT OR UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.sync_job_cost_total();

CREATE TRIGGER trg_job_costs_updated_at
  BEFORE UPDATE ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_costs_job_id   ON public.job_costs (job_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_category ON public.job_costs (category);

-- RLS
ALTER TABLE public.job_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select job_costs"
  ON public.job_costs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert job_costs"
  ON public.job_costs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job_costs"
  ON public.job_costs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job_costs"
  ON public.job_costs FOR DELETE
  TO authenticated
  USING (true);


-- ===========================================================================
-- END OF MIGRATION
-- ===========================================================================
