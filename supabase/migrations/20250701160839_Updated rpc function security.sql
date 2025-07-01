set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_membership_id uuid;
begin
  -- 1. Create the workspace
  insert into public.workspaces(owner_id, name, slug)
    values (v_user_id, p_workspace_name, p_workspace_slug)
    returning id into v_workspace_id;

  -- 2. Create the workspace membership
  insert into public.workspace_memberships (workspace_id, user_id)
    values (v_workspace_id, v_user_id)
    returning id into v_membership_id;

  -- 3. Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    v_workspace_id,
    v_user_id,
    v_membership_id,
    p_full_name,
    p_display_name
  );

  -- 4. Create the 'admin' role (because this user is the owner)
  insert into public.user_roles (workspace_id, user_id, membership_id, role)
    values (v_workspace_id, v_user_id, v_membership_id, 'admin');

  return v_workspace_id;
end;
$function$
;


