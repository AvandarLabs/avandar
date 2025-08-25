/* 02.5.user_workspace_policies.sql
 *
 * Consolidated policies after refactor:
 * - user_roles no longer has user_id; use membership_id + workspace_id
 * - rely on util__get_auth_user_owned_workspaces()
 *         and util__get_auth_user_workspaces()
 *         and util__get_auth_user_workspaces_by_role('admin')
 */

/* ================================
   WORKSPACES
   ================================ */

-- Drop any prior policies (both branches)
drop policy if exists "User can SELECT workspaces they own or belong to" on public.workspaces;
drop policy if exists "User can INSERT workspaces that they own" on public.workspaces;
drop policy if exists "User can UPDATE workspaces they admin" on public.workspaces;
drop policy if exists "User can DELETE workspaces they are an owner of" on public.workspaces;

create policy "User can SELECT workspaces they own or belong to"
on public.workspaces for select to authenticated
using (
  public.workspaces.owner_id = (select auth.uid())
  or public.workspaces.id = any (array(select public.util__get_auth_user_workspaces()))
);

create policy "User can INSERT workspaces that they own"
on public.workspaces for insert to authenticated
with check (
  public.workspaces.owner_id = (select auth.uid())
);

create policy "User can UPDATE workspaces they admin"
on public.workspaces for update to authenticated
using (
  public.workspaces.id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
)
with check (
  public.workspaces.owner_id = any (array(select public.util__get_workspace_members(public.workspaces.id)))
);

create policy "User can DELETE workspaces they are an owner of"
on public.workspaces for delete to authenticated
using (
  public.workspaces.owner_id = any (array(select public.util__get_auth_user_owned_workspaces()))
);

/* ================================
   WORKSPACE_MEMBERSHIPS
   ================================ */
-- Workspace memberships RLS (idempotent)
alter table public.workspace_memberships enable row level security;

-- Clean up old names
drop policy if exists "Owner can INSERT themselves as workspace members; Admin can INS" on public.workspace_memberships;
drop policy if exists "User can DELETE their own memberships; Admin can DELETE other m" on public.workspace_memberships;
drop policy if exists "User can SELECT their own memberships or memberships of other u" on public.workspace_memberships;

-- SELECT
create policy "User can SELECT their own memberships; User can SELECT memberships in their workspaces"
on public.workspace_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or workspace_id = any ( array( select public.util__get_auth_user_workspaces() ) )
);

-- INSERT
create policy "Owner can INSERT themselves as workspace members; Admin can INSERT others"
on public.workspace_memberships
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and workspace_id = any ( array( select public.util__get_auth_user_owned_workspaces() ) )
  )
  or
  workspace_id = any ( array( select public.util__get_auth_user_workspaces_by_role('admin') ) )
);

-- DELETE
create policy "User can DELETE their own memberships; Admin can DELETE in their workspaces"
on public.workspace_memberships
for delete
to authenticated
using (
  user_id = auth.uid()
  or workspace_id = any ( array( select public.util__get_auth_user_workspaces_by_role('admin') ) )
);

/* ================================
   USER_PROFILES
   (user_profiles still has user_id — OK)
   ================================ */

drop policy if exists "User can SELECT their own profiles or profiles of other workspace members" on public.user_profiles;
drop policy if exists "User can SELECT profiles in workspaces they belong to" on public.user_profiles;
drop policy if exists "Owner can INSERT their own user_profiles; Admin can INSERT other user_profiles" on public.user_profiles;
drop policy if exists "Owner can INSERT own profile; Admin can INSERT others" on public.user_profiles;
drop policy if exists "User can UPDATE their own user_profiles; Admin can UPDATE other user_profiles" on public.user_profiles;
drop policy if exists "User can UPDATE own profile; Admin can UPDATE others" on public.user_profiles;
drop policy if exists "User can DELETE their own user_profiles; Admin can DELETE other user_profiles" on public.user_profiles;
drop policy if exists "User can DELETE own profile; Admin can DELETE others" on public.user_profiles;

create policy "User can SELECT their own profiles; User can SELECT profiles of users of a workspace they are also in"
on public.user_profiles for select to authenticated
using (
  public.user_profiles.user_id = (select auth.uid())
  or public.user_profiles.workspace_id = any (array(select public.util__get_auth_user_workspaces()))
);

create policy "Owner can INSERT their own user profile in their own workspace; Admin can INSERT other user profiles"
on public.user_profiles for insert to authenticated
with check (
  (
    public.user_profiles.user_id = (select auth.uid())
    and public.user_profiles.workspace_id = any (array(select public.util__get_auth_user_owned_workspaces()))
  )
  or public.user_profiles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);

create policy "User can UPDATE their own user_profiles; Admin can UPDATE other user_profiles"
on public.user_profiles for update to authenticated
using (
  public.user_profiles.user_id = (select auth.uid())
  or public.user_profiles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);

create policy "User can DELETE their own user_profiles; Admin can DELETE any user_profiles in their workspace"
on public.user_profiles for delete to authenticated
using (
  public.user_profiles.user_id = (select auth.uid())
  or public.user_profiles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);

/* ================================
   USER_ROLES  (NO user_id here)
   ================================ */

-- Drop all legacy policy names from both branches
drop policy if exists "User can SELECT their own user_roles or roles of other workspace members" on public.user_roles;
drop policy if exists "User can SELECT roles for memberships they belong to" on public.user_roles;
drop policy if exists "Owner can INSERT their own user_roles; Admin can INSERT other user_roles" on public.user_roles;
drop policy if exists "Owner can INSERT own role; Admin can INSERT others" on public.user_roles;
drop policy if exists "Admin can UPDATE other user_roles" on public.user_roles;
drop policy if exists "Admin can UPDATE user_roles in their workspace" on public.user_roles;
drop policy if exists "User can DELETE their own user_roles; Admin can DELETE other user_roles" on public.user_roles;
drop policy if exists "User can DELETE own role; Admin can DELETE others" on public.user_roles;

-- SELECT: a member can read roles tied to their membership,
--         and can read roles in workspaces they belong to.
create policy "User can SELECT roles tied to their membership or in their workspaces"
on public.user_roles for select to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = (select auth.uid())
  )
  or public.user_roles.workspace_id = any (array(select public.util__get_auth_user_workspaces()))
);

-- INSERT: owner can insert their own role row; admins can insert any role in their workspaces
create policy "Owner can INSERT own role; Admin can INSERT others"
on public.user_roles for insert to authenticated
with check (
  (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.id = public.user_roles.membership_id
        and wm.user_id = (select auth.uid())
        and wm.workspace_id = any (array(select public.util__get_auth_user_owned_workspaces()))
    )
  )
  or public.user_roles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);

-- UPDATE: only admins in the workspace can update roles
create policy "Admin can UPDATE user_roles in their workspace"
on public.user_roles for update to authenticated
using (
  public.user_roles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
)
with check (
  public.user_roles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);

-- DELETE: a member can delete their own role row (via membership), or admins can delete any in their workspaces
create policy "User can DELETE own role; Admin can DELETE others"
on public.user_roles for delete to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = public.user_roles.membership_id
      and wm.user_id = (select auth.uid())
  )
  or public.user_roles.workspace_id = any (array(select public.util__get_auth_user_workspaces_by_role('admin')))
);
