CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.is_member(UUID, UUID) SET SCHEMA private;
ALTER FUNCTION public.member_role(UUID, UUID) SET SCHEMA private;
ALTER FUNCTION public.can_edit(UUID, UUID) SET SCHEMA private;
ALTER FUNCTION public.is_admin(UUID, UUID) SET SCHEMA private;
ALTER FUNCTION public.seed_workspace_defaults() SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

REVOKE ALL ON FUNCTION private.is_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.member_role(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.seed_workspace_defaults() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.member_role(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_edit(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION private.bootstrap_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Workspace owner must match the signed-in user';
  END IF;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.created_by)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bootstrap_workspace_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.bootstrap_workspace_owner() TO service_role;

CREATE TRIGGER workspaces_owner_bootstrap
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION private.bootstrap_workspace_owner();

DROP POLICY "invitations read" ON public.invitations;
CREATE POLICY "invitations admin read"
ON public.invitations
FOR SELECT
TO authenticated
USING (private.is_admin(workspace_id, auth.uid()));