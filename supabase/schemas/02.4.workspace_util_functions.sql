-- Utility functions for workspace-related RLS policies

-- Checks if the authenticated user is a member of a workspace
create or replace function public.util__auth_user_is_workspace_member(workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
      and workspace_memberships.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;
comment on function public.util__auth_user_is_workspace_member(workspace_id uuid) is
  'Checks if the current user is a member of the specified workspace';

-- Checks if the authenticated user is an admin of a workspace
create or replace function public.util__auth_user_is_workspace_admin(workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
      and workspace_memberships.user_id = auth.uid()
      and workspace_memberships.role = 'admin'
  );
end;
$$ language plpgsql security definer;
comment on function public.util__auth_user_is_workspace_admin(workspace_id uuid) is
  'Checks if the current user is an admin of the specified workspace';

-- Checks if the authenticated user is the owner of a workspace
create or replace function public.util__auth_user_is_workspace_owner(workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspaces
    where workspaces.id = $1
      and workspaces.owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer;
comment on function public.util__auth_user_is_workspace_owner(workspace_id uuid) is
  'Checks if the current user is the owner of the specified workspace';

-- Checks if a given user is in a workspace
create or replace function public.util__user_is_workspace_member(user_id uuid, workspace_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspace_memberships
    where workspace_memberships.workspace_id = $2
      and workspace_memberships.user_id = $1
  );
end;
$$ language plpgsql security definer;
comment on function public.util__user_is_workspace_member(user_id uuid, workspace_id uuid) is
  'Checks if the specified user is a member of the specified workspace';
