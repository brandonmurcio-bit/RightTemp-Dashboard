-- Evaluate auth.uid() once per statement instead of once per candidate row.
DROP POLICY IF EXISTS "Users can insert their own profile"
  ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile"
  ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Org admins can remove members"
  ON public.organization_members;

CREATE POLICY "Org admins can remove members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (
    private.is_org_role(organization_id, 'admin')
    OR user_id = (SELECT auth.uid())
  );

-- Cover foreign keys used by joins and cascading parent updates/deletes.
CREATE INDEX IF NOT EXISTS idx_estimates_lead_id
  ON public.estimates (lead_id);

CREATE INDEX IF NOT EXISTS idx_org_members_invited_by
  ON public.organization_members (invited_by);

CREATE INDEX IF NOT EXISTS idx_payments_estimate_id
  ON public.payments (estimate_id);
