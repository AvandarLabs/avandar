-- Ensure the helpers we rely on exist (safe to re-create)
set check_function_bodies = off;

create or replace function public.util__get_auth_user_owned_workspaces()
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select w.id from public.workspaces w
    where w.owner_id = auth.uid()
  );
end; $$;

create or replace function public.util__get_auth_user_workspaces_by_role(role text)
returns uuid[] language plpgsql security definer as $$
begin
  return array(
    select ur.workspace_id
    from public.user_roles ur
    join public.workspace_memberships wm on wm.id = ur.membership_id
    where wm.user_id = auth.uid()
      and ur.role = $1
  );
end; $$;

-- Nuke any existing user_roles policies (old names and our new names), idempotently
drop policy if exists "Admin can UPDATE other user_roles" on public.user_roles;
drop policy if exists "Owner can INSERT their own user_roles; Admin can INSERT other u" on public.user_roles;
drop policy if exists "User can DELETE their own user_roles; Admin can DELETE other us" on public.user_roles;
drop policy if exists "User can SELECT their own user_roles or roles of other workspac" on public.user_roles;

drop policy if exists "User can SELECT roles for memberships they belong to" on public.user_roles;
drop policy if exists "Owner can INSERT own role; Admin can INSERT others" on public.user_roles;
drop policy if exists "Admin can UPDATE user_roles in their workspace" on public.user_roles;
drop policy if exists "User can DELETE own role; Admin can DELETE others" on public.user_roles;

-- Recreate user_roles policies WITHOUT any reference to user_roles.user_id
-- and WITHOUT any util__auth_user_is_* functions.

-- SELECT: members can see their own role row; anyone in the same workspace can read roles
create policy "User can SELECT roles for memberships they belong to"
on public.user_roles
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = auth.uid()
  )
  or public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
  or public.user_roles.workspace_id = any (
    array(
      select public.workspace_memberships.workspace_id
      from public.workspace_memberships
      where public.workspace_memberships.user_id = auth.uid()
    )
  )
);

-- INSERT: owners can insert their own role row; admins can insert any role in their workspace
create policy "Owner can INSERT own role; Admin can INSERT others"
on public.user_roles
for insert
to authenticated
with check (
  (
    -- owner inserting a role for their own membership in a workspace they own
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.id = public.user_roles.membership_id
        and wm.user_id = auth.uid()
        and wm.workspace_id = public.user_roles.workspace_id
    )
    and public.user_roles.workspace_id = any (
      array(select public.util__get_auth_user_owned_workspaces())
    )
  )
  or
  -- admins of the workspace can insert any role row in that workspace
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);

-- UPDATE: only admins in that workspace
create policy "Admin can UPDATE user_roles in their workspace"
on public.user_roles
as permissive
for update
to authenticated
using (
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
)
with check (
  public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);

-- DELETE: a member can delete their own role row; admins can delete any in their workspace
create policy "User can DELETE own role; Admin can DELETE others"
on public.user_roles
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = auth.uid()
  )
  or public.user_roles.workspace_id = any (
    array(select public.util__get_auth_user_workspaces_by_role('admin'))
  )
);
