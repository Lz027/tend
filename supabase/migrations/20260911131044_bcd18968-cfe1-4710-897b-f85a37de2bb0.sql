CREATE OR REPLACE FUNCTION public.create_workspace(
  _name TEXT,
  _timezone TEXT DEFAULT 'UTC',
  _currency TEXT DEFAULT 'USD'
)
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_workspace public.workspaces;
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF length(trim(_name)) < 2 OR length(trim(_name)) > 80 THEN
    RAISE EXCEPTION 'Workspace name must be between 2 and 80 characters';
  END IF;

  INSERT INTO public.workspaces (name, timezone, currency, created_by)
  VALUES (
    trim(_name),
    COALESCE(NULLIF(trim(_timezone), ''), 'UTC'),
    upper(COALESCE(NULLIF(trim(_currency), ''), 'USD')),
    current_user_id
  )
  RETURNING * INTO created_workspace;

  INSERT INTO public.memberships (workspace_id, user_id, role)
  VALUES (created_workspace.id, current_user_id, 'owner');

  INSERT INTO public.notification_prefs (user_id)
  VALUES (current_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN created_workspace;
END;
$$;

REVOKE ALL ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.is_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.member_role(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_workspace_defaults() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.member_role(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID, UUID) TO authenticated, service_role;