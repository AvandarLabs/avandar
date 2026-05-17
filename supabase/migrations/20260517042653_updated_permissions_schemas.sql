set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS public.workspaces
 LANGUAGE plpgsql
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
  v_membership_id uuid;
begin
  -- Create the workspace
  insert into public.workspaces (
    owner_id,
    name,
    slug
  ) values (
    v_owner_id,
    p_workspace_name,
    p_workspace_slug
  ) returning * into v_workspace;

  -- Create the workspace membership (owner = Global Admin preset)
  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role_group_id
  )
  select
    v_workspace.id,
    v_owner_id,
    rg.id
  from
    public.role_groups rg
  where
    rg.workspace_id = v_workspace.id and
    rg.name = 'Global Admin' and
    rg.is_builtin
  returning id into v_membership_id;

  -- Create the user profile
  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    v_workspace.id,
    v_owner_id,
    v_membership_id,
    p_full_name,
    p_display_name
  );

  return v_workspace;
end;
$function$
;


