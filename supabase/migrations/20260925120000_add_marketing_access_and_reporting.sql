-- RightTemp marketing access and attribution reporting.
-- Marketing members use a restricted reporting RPC instead of direct access to
-- operational lead, estimate, customer, job, invoice, or document rows.

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'marketing'));

CREATE OR REPLACE FUNCTION private.is_org_any_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_staff_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin', 'member')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_org_marketing_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.role = 'marketing'
  );
$$;

-- Existing operational policies all use is_org_member(). Keep that helper as
-- the staff-only gate so marketing users cannot read operational tables.
CREATE OR REPLACE FUNCTION private.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.is_org_staff_member(org_id);
$$;

CREATE OR REPLACE FUNCTION private.is_org_role(org_id UUID, min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
      AND CASE min_role
        WHEN 'owner' THEN m.role = 'owner'
        WHEN 'admin' THEN m.role IN ('owner', 'admin')
        WHEN 'marketing' THEN m.role = 'marketing'
        ELSE m.role IN ('owner', 'admin', 'member')
      END
  );
$$;

REVOKE ALL ON FUNCTION private.is_org_any_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_staff_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_marketing_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_any_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_staff_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_marketing_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "Org members can view their organization"
  ON public.organizations;
CREATE POLICY "Org members can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (private.is_org_any_member(id));

DROP POLICY IF EXISTS "Authenticated users can view all profiles"
  ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS profile_membership
      WHERE profile_membership.user_id = profiles.id
        AND private.is_org_staff_member(profile_membership.organization_id)
    )
  );

DROP POLICY IF EXISTS "Org members can view all members of their org"
  ON public.organization_members;
CREATE POLICY "Org members can view all members of their org"
  ON public.organization_members FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_org_staff_member(organization_id)
  );

DROP POLICY IF EXISTS "Org members can view organization branding"
  ON public.organization_branding;
CREATE POLICY "Org members can view organization branding"
  ON public.organization_branding FOR SELECT TO authenticated
  USING (private.is_org_any_member(organization_id));

CREATE TABLE IF NOT EXISTS public.marketing_campaign_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  spend_date      DATE NOT NULL,
  campaign        TEXT NOT NULL CHECK (char_length(trim(campaign)) BETWEEN 1 AND 200),
  source          TEXT,
  medium          TEXT,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description     TEXT,
  created_by      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_org_date
  ON public.marketing_campaign_spend(organization_id, spend_date);

CREATE TRIGGER trg_marketing_campaign_spend_updated_at
  BEFORE UPDATE ON public.marketing_campaign_spend
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marketing_campaign_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketing members can view campaign spend"
  ON public.marketing_campaign_spend FOR SELECT TO authenticated
  USING (
    private.is_org_role(organization_id, 'admin')
    OR private.is_org_marketing_member(organization_id)
  );

CREATE POLICY "Marketing members can record campaign spend"
  ON public.marketing_campaign_spend FOR INSERT TO authenticated
  WITH CHECK (
    (
      private.is_org_role(organization_id, 'admin')
      OR private.is_org_marketing_member(organization_id)
    )
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "Marketing members can update campaign spend"
  ON public.marketing_campaign_spend FOR UPDATE TO authenticated
  USING (
    private.is_org_role(organization_id, 'admin')
    OR private.is_org_marketing_member(organization_id)
  )
  WITH CHECK (
    private.is_org_role(organization_id, 'admin')
    OR private.is_org_marketing_member(organization_id)
  );

CREATE POLICY "Org admins can delete campaign spend"
  ON public.marketing_campaign_spend FOR DELETE TO authenticated
  USING (private.is_org_role(organization_id, 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.marketing_campaign_spend TO authenticated;

CREATE POLICY "Org members can read branding assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'organization-branding'
    AND private.is_org_any_member(public.storage_org_id(name))
  );

CREATE OR REPLACE FUNCTION public.get_marketing_dashboard(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  start_date DATE := COALESCE(p_start_date, CURRENT_DATE - 30);
  end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
  result JSONB;
BEGIN
  IF auth.uid() IS NULL
     OR NOT private.is_org_any_member(p_organization_id)
     OR NOT (
       private.is_org_role(p_organization_id, 'admin')
       OR private.is_org_marketing_member(p_organization_id)
     ) THEN
    RAISE EXCEPTION 'Marketing access denied';
  END IF;

  IF end_date < start_date THEN
    RAISE EXCEPTION 'The reporting end date must be on or after the start date';
  END IF;

  WITH lead_rows AS (
    SELECT
      l.id,
      l.name,
      l.created_at,
      l.status,
      l.source,
      l.service_type,
      l.urgency,
      l.attribution_source,
      l.attribution_medium,
      l.attribution_campaign,
      l.attribution_content,
      l.attribution_term,
      l.landing_page,
      l.referrer,
      l.click_id,
      COALESCE(revenue.estimated_revenue, 0)::NUMERIC AS estimated_revenue,
      COALESCE(revenue.sold_revenue, 0)::NUMERIC AS sold_revenue
    FROM public.leads AS l
    LEFT JOIN LATERAL (
      SELECT
        SUM(e.total) AS estimated_revenue,
        SUM(e.total) FILTER (WHERE e.status IN ('won', 'approved')) AS sold_revenue
      FROM public.estimates AS e
      WHERE e.organization_id = l.organization_id
        AND e.lead_id = l.id
    ) AS revenue ON TRUE
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= start_date::TIMESTAMPTZ
      AND l.created_at < (end_date + 1)::TIMESTAMPTZ
  ),
  spend_rows AS (
    SELECT
      s.id,
      s.spend_date,
      s.campaign,
      s.source,
      s.medium,
      s.amount,
      s.description
    FROM public.marketing_campaign_spend AS s
    WHERE s.organization_id = p_organization_id
      AND s.spend_date BETWEEN start_date AND end_date
  ),
  totals AS (
    SELECT
      COUNT(*)::INT AS total_leads,
      COUNT(*) FILTER (WHERE status = 'new')::INT AS new_leads,
      COUNT(*) FILTER (WHERE status = 'contacted')::INT AS contacted_leads,
      COUNT(*) FILTER (WHERE status = 'qualified')::INT AS qualified_leads,
      COUNT(*) FILTER (WHERE status = 'proposal')::INT AS proposal_leads,
      COUNT(*) FILTER (WHERE status = 'won')::INT AS won_leads,
      COUNT(*) FILTER (WHERE status = 'lost')::INT AS lost_leads,
      COALESCE(SUM(estimated_revenue), 0)::NUMERIC AS estimated_revenue,
      COALESCE(SUM(sold_revenue), 0)::NUMERIC AS sold_revenue
    FROM lead_rows
  ),
  spend_total AS (
    SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total_spend
    FROM spend_rows
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalLeads', totals.total_leads,
      'newLeads', totals.new_leads,
      'contactedLeads', totals.contacted_leads,
      'qualifiedLeads', totals.qualified_leads,
      'proposalLeads', totals.proposal_leads,
      'wonLeads', totals.won_leads,
      'lostLeads', totals.lost_leads,
      'qualificationRate', CASE WHEN totals.total_leads > 0 THEN ROUND((totals.qualified_leads::NUMERIC / totals.total_leads) * 100, 1) ELSE 0 END,
      'proposalRate', CASE WHEN totals.total_leads > 0 THEN ROUND((totals.proposal_leads::NUMERIC / totals.total_leads) * 100, 1) ELSE 0 END,
      'conversionRate', CASE WHEN totals.total_leads > 0 THEN ROUND((totals.won_leads::NUMERIC / totals.total_leads) * 100, 1) ELSE 0 END,
      'estimatedRevenue', totals.estimated_revenue,
      'soldRevenue', totals.sold_revenue,
      'totalSpend', spend_total.total_spend,
      'costPerLead', CASE WHEN totals.total_leads > 0 THEN ROUND(spend_total.total_spend / totals.total_leads, 2) ELSE 0 END,
      'roas', CASE WHEN spend_total.total_spend > 0 THEN ROUND(totals.sold_revenue / spend_total.total_spend, 2) ELSE 0 END
    ),
    'bySource', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', grouped.label, 'leads', grouped.leads, 'won', grouped.won, 'soldRevenue', grouped.sold_revenue) ORDER BY grouped.leads DESC)
      FROM (
        SELECT
          COALESCE(NULLIF(attribution_source, ''), NULLIF(source, ''), 'Unattributed') AS label,
          COUNT(*)::INT AS leads,
          COUNT(*) FILTER (WHERE status = 'won')::INT AS won,
          COALESCE(SUM(sold_revenue), 0)::NUMERIC AS sold_revenue
        FROM lead_rows
        GROUP BY 1
      ) AS grouped
    ), '[]'::JSONB),
    'byMedium', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', grouped.label, 'leads', grouped.leads, 'won', grouped.won, 'soldRevenue', grouped.sold_revenue) ORDER BY grouped.leads DESC)
      FROM (
        SELECT
          COALESCE(NULLIF(attribution_medium, ''), 'Unattributed') AS label,
          COUNT(*)::INT AS leads,
          COUNT(*) FILTER (WHERE status = 'won')::INT AS won,
          COALESCE(SUM(sold_revenue), 0)::NUMERIC AS sold_revenue
        FROM lead_rows
        GROUP BY 1
      ) AS grouped
    ), '[]'::JSONB),
    'byCampaign', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', grouped.label,
        'leads', grouped.leads,
        'qualified', grouped.qualified,
        'won', grouped.won,
        'lost', grouped.lost,
        'estimatedRevenue', grouped.estimated_revenue,
        'soldRevenue', grouped.sold_revenue
      ) ORDER BY grouped.leads DESC)
      FROM (
        SELECT
          COALESCE(NULLIF(attribution_campaign, ''), 'Unattributed') AS label,
          COUNT(*)::INT AS leads,
          COUNT(*) FILTER (WHERE status IN ('qualified', 'proposal', 'won'))::INT AS qualified,
          COUNT(*) FILTER (WHERE status = 'won')::INT AS won,
          COUNT(*) FILTER (WHERE status = 'lost')::INT AS lost,
          COALESCE(SUM(estimated_revenue), 0)::NUMERIC AS estimated_revenue,
          COALESCE(SUM(sold_revenue), 0)::NUMERIC AS sold_revenue
        FROM lead_rows
        GROUP BY 1
      ) AS grouped
    ), '[]'::JSONB),
    'leads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', row.id,
        'name', row.name,
        'createdAt', row.created_at,
        'status', row.status,
        'source', row.source,
        'serviceType', row.service_type,
        'urgency', row.urgency,
        'attributionSource', row.attribution_source,
        'attributionMedium', row.attribution_medium,
        'attributionCampaign', row.attribution_campaign,
        'attributionContent', row.attribution_content,
        'attributionTerm', row.attribution_term,
        'landingPage', row.landing_page,
        'referrer', row.referrer,
        'clickId', row.click_id,
        'estimatedRevenue', row.estimated_revenue,
        'soldRevenue', row.sold_revenue
      ) ORDER BY row.created_at DESC)
      FROM lead_rows AS row
    ), '[]'::JSONB),
    'spend', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', row.id,
        'spendDate', row.spend_date,
        'campaign', row.campaign,
        'source', row.source,
        'medium', row.medium,
        'amount', row.amount,
        'description', row.description
      ) ORDER BY row.spend_date DESC, row.created_at DESC)
      FROM (
        SELECT spend_rows.*, s.created_at
        FROM spend_rows
        JOIN public.marketing_campaign_spend AS s ON s.id = spend_rows.id
      ) AS row
    ), '[]'::JSONB)
  )
  INTO result
  FROM totals, spend_total;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_marketing_dashboard(UUID, DATE, DATE)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_dashboard(UUID, DATE, DATE)
  TO authenticated;