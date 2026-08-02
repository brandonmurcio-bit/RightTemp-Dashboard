-- Keep RLS helper functions outside the exposed public API schema.
-- Policies retain their function dependencies when the functions move schemas.
CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.is_org_member(UUID) SET SCHEMA private;
ALTER FUNCTION public.is_org_role(UUID, TEXT) SET SCHEMA private;
ALTER FUNCTION public.get_my_org_ids() SET SCHEMA private;
ALTER FUNCTION public.org_has_no_members(UUID) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- RLS policies execute the membership helpers as authenticated users, but the
-- private schema is not exposed by the Data API, so these are not public RPCs.
REVOKE ALL ON FUNCTION private.is_org_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_my_org_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.org_has_no_members(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_org_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_org_ids() TO authenticated;

-- RightTemp OS currently provisions organizations administratively. Allowing
-- arbitrary signed-in users to create an organization and claim any orphaned
-- organization was an insecure bootstrap path.
DROP POLICY IF EXISTS "Authenticated users can create organizations"
  ON public.organizations;

DROP POLICY IF EXISTS "Org admins can insert members"
  ON public.organization_members;

CREATE POLICY "Org admins can insert members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_org_role(organization_id, 'admin')
  );
