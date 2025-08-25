<<<<<<< HEAD
-- Policies: user_profiles
drop policy if exists "User can SELECT their own profiles or profiles of other workspace members" on public.user_profiles;
create policy "User can SELECT profiles in workspaces they belong to"
  on public.user_profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.id = user_profiles.membership_id
        and wm.workspace_id = user_profiles.workspace_id
        and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Owner can INSERT their own user_profiles; Admin can INSERT other user_profiles" on public.user_profiles;
create policy "Owner can INSERT own profile; Admin can INSERT others"
  on public.user_profiles for insert
  to authenticated
  with check (
    (
      -- owners can insert their own profile
      auth.uid() = user_profiles.user_id
      and public.util__auth_user_is_workspace_owner(workspace_id)
    ) or
    -- admins can insert anyone's
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

drop policy if exists "User can UPDATE their own user_profiles; Admin can UPDATE other user_profiles" on public.user_profiles;
create policy "User can UPDATE own profile; Admin can UPDATE others"
  on public.user_profiles for update
  to authenticated
  using (
    auth.uid() = user_profiles.user_id
    or public.util__auth_user_is_workspace_admin(workspace_id)
  )
  with check (
    auth.uid() = user_profiles.user_id
    or public.util__auth_user_is_workspace_admin(workspace_id)
  );

drop policy if exists "User can DELETE their own user_profiles; Admin can DELETE other user_profiles" on public.user_profiles;
create policy "User can DELETE own profile; Admin can DELETE others"
  on public.user_profiles for delete
  to authenticated
  using (
    auth.uid() = user_profiles.user_id
    or public.util__auth_user_is_workspace_admin(workspace_id)
  );

-- Policies: user_roles
drop policy if exists "User can SELECT their own user_roles or roles of other workspace members" on public.user_roles;
create policy "User can SELECT roles for memberships they belong to"
  on public.user_roles for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.id = user_roles.membership_id
        and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Owner can INSERT their own user_roles; Admin can INSERT other user_roles" on public.user_roles;
create policy "Owner can INSERT own role; Admin can INSERT others"
  on public.user_roles for insert
  to authenticated
  with check (
    (
      -- owner inserting their own role row
      exists (
        select 1 from public.workspace_memberships wm
        where wm.id = user_roles.membership_id
          and wm.user_id = auth.uid()
          and public.util__auth_user_is_workspace_owner(wm.workspace_id)
      )
    )
    or public.util__auth_user_is_workspace_admin(workspace_id)
  );

drop policy if exists "Admin can UPDATE other user_roles" on public.user_roles;
create policy "Admin can UPDATE user_roles in their workspace"
  on public.user_roles for update
  to authenticated
  using (
    public.util__auth_user_is_workspace_admin(workspace_id)
  )
  with check (
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

drop policy if exists "User can DELETE their own user_roles; Admin can DELETE other user_roles" on public.user_roles;
create policy "User can DELETE own role; Admin can DELETE others"
  on public.user_roles for delete
  to authenticated
  using (
    -- members can delete their own role row
    exists (
      select 1 from public.workspace_memberships wm
      where wm.id = user_roles.membership_id
        and wm.user_id = auth.uid()
    )
    or
    -- admins can delete any role row in their workspace
    public.util__auth_user_is_workspace_admin(workspace_id)
=======
/**
 * This file contains policies for all the workspace and user-related tables.
 * This file is named such that it goes **after** the workspace util functions
 * and the user and workspace tables. The order of declaration matters in SQL.
 */
------------------------------
-- Policies: workspaces
------------------------------
create policy "
  User can SELECT workspaces they own or belong to
" on public.workspaces for
select
  to authenticated using (
    -- User owns the workspace
    public.workspaces.owner_id = (
      select
        auth.uid ()
    ) or
    -- User belongs to the workspace
    public.workspaces.id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  User can INSERT workspaces that they own
" on public.workspaces for insert to authenticated
-- Anyone can create workspaces, but will still need to separately create:
-- 1. the workspace_memberships row to link the user to the workspace
-- 2. the user_profiles row for this user in this workspace
-- 3. the user_roles row for this user in this workspace
with
  check (
    -- User owns the workspace
    public.workspaces.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "
  User can UPDATE workspaces they admin
" on public.workspaces
for update
  to authenticated using (
    -- User is an admin of the workspace
    public.workspaces.id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  )
with
  check (
    -- The new owner must still be a workspace member
    public.workspaces.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.workspaces.id
          )
      )
    )
  );

create policy "
  User can DELETE workspaces they are an owner of
" on public.workspaces for delete to authenticated using (
  public.workspaces.owner_id = any (
    array(
      select
        public.util__get_auth_user_owned_workspaces ()
    )
  )
);

------------------------------
-- Policies: workspace_memberships
-- An UPDATE policy is intentionally not set. This table should only allow
-- adding users or removing users to a workspace.
------------------------------
create policy "
  User can SELECT their own memberships;
  User can SELECT memberships of a workspace they are also in
" on public.workspace_memberships for
select
  to authenticated using (
    -- User can select their own membership
    public.workspace_memberships.user_id = (
      select
        auth.uid ()
    ) or
    -- User can select memberships belonging to a workspace they are also in.
    -- This allows authenticated users to see who else is in their workspace.
    public.workspace_memberships.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  Owner can INSERT themselves as workspace members of their own workspace;
  Admin can INSERT other memberships
" on public.workspace_memberships for insert to authenticated
with
  check (
    -- Owner can insert themselves as a member of their own workspace
    (
      public.workspace_memberships.user_id = (
        select
          auth.uid ()
      ) and
      public.workspace_memberships.workspace_id = any (
        array(
          select
            public.util__get_auth_user_owned_workspaces ()
        )
      )
    ) or
    -- Admin can insert other memberships
    public.workspace_memberships.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  );

create policy "
  User can DELETE their own memberships;
  Admin can DELETE any memberships in their workspace
" on public.workspace_memberships for delete to authenticated using (
  -- User can delete themselves
  public.workspace_memberships.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete any memberships in their workspace
  public.workspace_memberships.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces_by_role ('admin')
    )
  )
);

-- Policies: user_profiles
create policy "
  User can SELECT their own profiles;
  User can SELECT profiles of users of a workspace they are also in
" on public.user_profiles for
select
  to authenticated using (
    -- User can select themselves
    public.user_profiles.user_id = (
      select
        auth.uid ()
    ) or
    -- User can select profiles belonging to a workspace they are also in.
    -- This allows authenticated users to see the profiles of others in
    -- their workspace.
    public.user_profiles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
>>>>>>> develop
  );

create policy "
  Owner can INSERT their own user profile in their own workspace;
  Admin can INSERT other user profiles
" on public.user_profiles for insert to authenticated
with
  check (
    -- User can insert their own user_profiles
    (
      public.user_profiles.user_id = (
        select
          auth.uid ()
      ) and
      public.user_profiles.workspace_id = any (
        array(
          select
            public.util__get_auth_user_owned_workspaces ()
        )
      )
    ) or
    -- Admin can insert other user_profiles
    public.user_profiles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  );

-- This policy allows user_profiles to be updated. It technically means that
-- the workspace_id is editable. We have a separate function and trigger in
-- user_profiles.sql to prevent this. We do not allow the user_id or
-- workspace_id to be changed, so that way user_profiles cannot be reassigned.
create policy "
  User can UPDATE their own user_profiles;
  Admin can UPDATE other user_profiles
" on public.user_profiles
for update
  to authenticated using (
    -- User can update their own user_profiles
    public.user_profiles.user_id = (
      select
        auth.uid ()
    ) or
    -- Admin can update other user_profiles
    public.user_profiles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  );

create policy "
  User can DELETE their own user_profiles;
  Admin can DELETE any user_profiles in their workspace
" on public.user_profiles for delete to authenticated using (
  -- User can delete their own user_profiles
  public.user_profiles.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete other user_profiles in their workspace
  public.user_profiles.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces_by_role ('admin')
    )
  )
);

------------------------------
-- Policies: user_roles
------------------------------
create policy "
  User can SELECT their own user_roles;
  User can SELECT roles of users of a workspace they are also in
" on public.user_roles for
select
  to authenticated using (
    -- User can select their own user_roles
    public.user_roles.user_id = (
      select
        auth.uid ()
    ) or
    -- User can select roles belonging to a workspace they are also in
    -- This allows authenticated users to see the roles of others in
    -- their workspace.
    public.user_roles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "
  Owner can INSERT their own user_roles in their own workspace;
  Admin can INSERT other user_roles
" on public.user_roles for insert to authenticated
with
  check (
    -- User can insert their own user_roles
    (
      public.user_roles.user_id = (
        select
          auth.uid ()
      ) and
      public.user_roles.workspace_id = any (
        array(
          select
            public.util__get_auth_user_owned_workspaces ()
        )
      )
    ) or
    -- Admin can insert other user_roles
    public.user_roles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  );

-- This policy is why `user_roles` has to be a separate table from
-- `user_profiles`. While users are allowed to update their own
-- `user_profiles`, they are **not** allowed to update their own roles.
-- Only admins can update roles.
create policy "Admin can UPDATE user_roles" on public.user_roles
for update
  to authenticated using (
    public.user_roles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces_by_role ('admin')
      )
    )
  );

-- This policy must allow users to delete their own roles because
-- if a user leaves a workspace (i.e. deletes their user profile, which
-- they are allowed to do), we need to allow the role to be deleted as well.
create policy "
  User can DELETE their own user_roles;
  Admin can DELETE other user_roles
" on public.user_roles for delete to authenticated using (
  -- User can delete their own user_roles
  public.user_roles.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete other user_roles
  public.user_roles.workspace_id = any (
    array(
      select
        public.util__get_auth_user_workspaces_by_role ('admin')
    )
  )
);
