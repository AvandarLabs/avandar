set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__add_user(p_workspace_id uuid, p_user_id uuid, p_full_name text, p_display_name text, p_user_role text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__create_with_owner(p_workspace_name text, p_workspace_slug text, p_full_name text, p_display_name text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
  declare
    v_user_id uuid := auth.uid();
    v_workspace_id uuid;
  begin
    -- Create the workspace
    insert into public.workspaces(owner_id, name, slug)
      values (v_user_id, p_workspace_name, p_workspace_slug)
      returning id into v_workspace_id;

    -- Call the rpc function to create the workspace membership and user profile
    perform public.rpc_workspaces__add_user(
      v_workspace_id,
      v_user_id,
      p_full_name,
      p_display_name,
      'admin'
    );

    return v_workspace_id;
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_profiles__prevent_id_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  begin
    if new.user_id <> old.user_id or
      new.workspace_id <> old.workspace_id or
      new.membership_id <> old.membership_id then
      raise exception 'user_id, workspace_id, and membership_id cannot be changed';
    end if;
    return new;
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_roles__prevent_id_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  begin
    if new.user_id <> old.user_id or
      new.workspace_id <> old.workspace_id or
      new.membership_id <> old.membership_id then
      raise exception 'user_id, workspace_id, and membership_id cannot be changed';
    end if;
    return new;
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_admin(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
      where workspace_memberships.workspace_id = $1
        and workspace_memberships.user_id = auth.uid()
        and workspace_memberships.role = 'admin'
    );
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_member(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
      where workspace_memberships.workspace_id = $1
        and workspace_memberships.user_id = auth.uid()
    );
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_is_workspace_owner(workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspaces
      where workspaces.id = $1
        and workspaces.owner_id = auth.uid()
    );
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  begin
    new.updated_at = (now() at time zone 'UTC');
    return new;
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__user_is_workspace_member(user_id uuid, workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  begin
    return exists (
      select 1 from public.workspace_memberships
      where workspace_memberships.workspace_id = $2
        and workspace_memberships.user_id = $1
    );
  end;
$function$
;


