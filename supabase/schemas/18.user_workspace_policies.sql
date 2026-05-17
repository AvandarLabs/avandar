/**
 * Policies for workspaces, workspace_memberships, user_profiles, and
 * Declared after permission helpers (e.g.
 * util__can_manage_workspace_settings) so RLS can reference them.
 */
--------------------------------------------------------------------------------
-- Policies: workspaces
--------------------------------------------------------------------------------
create policy "Users can select workspaces they own or belong to" on public.workspaces for
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

-- Anyone can create workspaces
create policy "Users can insert workspaces that they own" on public.workspaces for insert to authenticated
with
  check (
    -- User owns the workspace
    public.workspaces.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can UPDATE workspaces they admin" on public.workspaces
for update
  to authenticated using (
    public.util__can_manage_workspace_settings (
      public.workspaces.id
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

create policy "User can DELETE workspaces they are an owner of" on public.workspaces for delete to authenticated using (
  public.workspaces.owner_id = any (
    public.util__get_auth_user_owned_workspaces ()
  )
);

--------------------------------------------------------------------------------
-- Policies: workspace_memberships
-- An UPDATE policy is intentionally not set. This table should only allow
-- adding users or removing users to a workspace.
--------------------------------------------------------------------------------
create policy "Users can select workspace memberships" on public.workspace_memberships for
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

create policy "Users can insert workspace memberships" on public.workspace_memberships for insert to authenticated
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
    public.util__can_manage_workspace_settings (
      public.workspace_memberships.workspace_id
    )
  );

create policy "Users can delete workspace memberships" on public.workspace_memberships for delete to authenticated using (
  -- User can delete themselves
  public.workspace_memberships.user_id = (
    select
      auth.uid ()
  ) or
  public.util__can_manage_workspace_settings (
    public.workspace_memberships.workspace_id
  )
);

--------------------------------------------------------------------------------
-- Policies: user_profiles
--------------------------------------------------------------------------------
create policy "Users can select profiles" on public.user_profiles for
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
    public.util__can_manage_workspace_settings (
      public.user_profiles.workspace_id
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
    public.util__can_manage_workspace_settings (
      public.user_profiles.workspace_id
    )
  );

create policy "Users can DELETE profiles" on public.user_profiles for delete to authenticated using (
  -- User can delete their own user_profiles
  public.user_profiles.user_id = (
    select
      auth.uid ()
  ) or
  public.util__can_manage_workspace_settings (
    public.user_profiles.workspace_id
  )
);
