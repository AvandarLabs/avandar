-- Function: add a user to an existing workspace
create or replace function public.rpc_workspaces__add_user(
  p_workspace_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_display_name text,
  p_user_role text
)
returns uuid as $$
  declare
    v_membership_id uuid;
  begin
    -- Check the requesting user is an admin of the workspace or the owner.
    -- We also check for ownership, because if the workspace was just
    -- created then a `user_roles` row does not exist yet, because we still
    -- haven't finished created the user owner's role.
    if (
      not public.util__auth_user_is_workspace_owner(p_workspace_id) and
      not public.util__auth_user_is_workspace_admin(p_workspace_id)
    ) then
      raise 'The requesting user is not an admin of this workspace';
    end if;

    -- Create the workspace membership
    insert into public.workspace_memberships (workspace_id, user_id)
      values (p_workspace_id, p_user_id)
      returning id into v_membership_id;

    -- Create the user profile
    insert into public.user_profiles (
      workspace_id,
      user_id,
      membership_id,
      full_name,
      display_name
    ) values (
      p_workspace_id,
      p_user_id,
      v_membership_id,
      p_full_name,
      p_display_name
    );

    -- Create the user role
    insert into public.user_roles (workspace_id, user_id, membership_id, role)
      values (p_workspace_id, p_user_id, v_membership_id, p_user_role);

    return v_membership_id;
  end;
$$
language plpgsql
security invoker;
comment on function public.rpc_workspaces__add_user(
  p_workspace_id uuid,
  p_user_id uuid,
  p_full_name text,
  p_display_name text,
  p_user_role text
) is
  'Adds a user to an existing workspace with the given role. '
  'Returns the workspace ID. '
  'The requesting user must be an admin of the workspace.';

-- Function: create a new workspace and assign the current user as the owner. Returns the workspace ID.
create or replace function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
)
returns uuid as $$
  declare
    v_owner_id uuid := auth.uid();
    v_workspace_id uuid;
  begin
    -- Create the workspace
    insert into public.workspaces (owner_id, name, slug)
      values (v_owner_id, p_workspace_name, p_workspace_slug)
      returning id into v_workspace_id;

    -- Call the rpc function to create the workspace membership and user profile
    perform public.rpc_workspaces__add_user(
      v_workspace_id,
      v_owner_id,
      p_full_name,
      p_display_name,
      'admin'
    );

    return v_workspace_id;
  end;
$$
language plpgsql
security invoker;
comment on function public.rpc_workspaces__create_with_owner(
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) is
  'Creates a new workspace and assigns the current user as the owner. '
  'Returns the workspace ID.';