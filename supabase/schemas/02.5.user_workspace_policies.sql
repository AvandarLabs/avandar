/**
 * This file contains policies for all the workspace and user-related tables.
 * This file is named such that it goes **after** the workspace util functions
 * and the user and workspace tables. The order of declaration matters in SQL.
 */
------------------------------
-- Policies: workspaces
------------------------------
create policy "Users can SELECT workspaces they own or belong to" on public.workspaces for
select
  to authenticated using (
    -- User owns the workspace
    public.workspaces.owner_id = (
      select
        auth.uid ()
    ) or
    -- User belongs to the workspace
    public.workspaces.id = any (
      public.util__get_auth_user_workspaces ()
    )
  );

create policy "Users can INSERT workspaces that they own" on public.workspaces for insert to authenticated
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
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  )
with
  check (
    -- The new owner must still be a workspace member
    public.workspaces.owner_id = any (
      public.util__get_workspace_members (
        public.workspaces.id
      )
    )
  );

create policy "
  User can DELETE workspaces they are an owner of
" on public.workspaces for delete to authenticated using (
  public.workspaces.owner_id = any (
    public.util__get_auth_user_owned_workspaces ()
  )
);

------------------------------
-- Policies: workspace_memberships
-- An UPDATE policy is intentionally not set. This table should only allow
-- adding users or removing users to a workspace.
------------------------------
create policy "Users can SELECT workspace memberships" on public.workspace_memberships for
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
      public.util__get_auth_user_workspaces ()
    )
  );

create policy "Users can INSERT workspace memberships" on public.workspace_memberships for insert to authenticated
with
  check (
    -- Owner can insert themselves as a member of their own workspace
    (
      public.workspace_memberships.user_id = (
        select
          auth.uid ()
      ) and
      public.workspace_memberships.workspace_id = any (
        public.util__get_auth_user_owned_workspaces ()
      )
    ) or
    -- Admin can insert other memberships
    public.workspace_memberships.workspace_id = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  );

create policy "Users can DELETE workspace memberships" on public.workspace_memberships for delete to authenticated using (
  -- User can delete themselves
  public.workspace_memberships.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete any memberships in their workspace
  public.workspace_memberships.workspace_id = any (
    public.util__get_auth_user_workspaces_by_role ('admin')
  )
);

-- Policies: user_profiles
create policy "Users can SELECT profiles" on public.user_profiles for
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
      public.util__get_auth_user_workspaces ()
    )
  );

create policy "Users can INSERT profiles" on public.user_profiles for insert to authenticated
with
  check (
    -- User can insert their own user_profiles
    (
      public.user_profiles.user_id = (
        select
          auth.uid ()
      ) and
      public.user_profiles.workspace_id = any (
        public.util__get_auth_user_owned_workspaces ()
      )
    ) or
    -- Admin can insert other user_profiles
    public.user_profiles.workspace_id = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  );

-- This policy allows user_profiles to be updated. It technically means that
-- the workspace_id is editable. We have a separate function and trigger in
-- user_profiles.sql to prevent this. We do not allow the user_id or
-- workspace_id to be changed, so that way user_profiles cannot be reassigned.
create policy "Users can UPDATE profiles" on public.user_profiles
for update
  to authenticated using (
    -- User can update their own user_profiles
    public.user_profiles.user_id = (
      select
        auth.uid ()
    ) or
    -- Admin can update other user_profiles
    public.user_profiles.workspace_id = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  );

create policy "Users can DELETE profiles" on public.user_profiles for delete to authenticated using (
  -- User can delete their own user_profiles
  public.user_profiles.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete other user_profiles in their workspace
  public.user_profiles.workspace_id = any (
    public.util__get_auth_user_workspaces_by_role ('admin')
  )
);

------------------------------
-- Policies: user_roles
------------------------------
create policy "Users can SELECT user roles" on public.user_roles for
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
      public.util__get_auth_user_workspaces ()
    )
  );

create policy "Users can INSERT user roles" on public.user_roles for insert to authenticated
with
  check (
    -- User can insert their own user_roles
    (
      public.user_roles.user_id = (
        select
          auth.uid ()
      ) and
      public.user_roles.workspace_id = any (
        public.util__get_auth_user_owned_workspaces ()
      )
    ) or
    -- Admin can insert other user_roles
    public.user_roles.workspace_id = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  );

-- This policy is why `user_roles` has to be a separate table from
-- `user_profiles`. While users are allowed to update their own
-- `user_profiles`, they are **not** allowed to update their own roles.
-- Only admins can update roles.
create policy "Admins can UPDATE user_roles" on public.user_roles
for update
  to authenticated using (
    public.user_roles.workspace_id = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  );

-- This policy must allow users to delete their own roles because
-- if a user leaves a workspace (i.e. deletes their user profile, which
-- they are allowed to do), we need to allow the role to be deleted as well.
create policy "Users can DELETE user roles" on public.user_roles for delete to authenticated using (
  -- User can delete their own user_roles
  public.user_roles.user_id = (
    select
      auth.uid ()
  ) or
  -- Admin can delete other user_roles
  public.user_roles.workspace_id = any (
    public.util__get_auth_user_workspaces_by_role ('admin')
  )
);
