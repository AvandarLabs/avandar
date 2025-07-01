-- Policies for all the workspace and user-related tables.
-- This file needs to go after the workspace util functions and the user and
-- workspace tables.

-- Policies: workspaces
create policy "User can SELECT workspaces they own or belong to"
  on public.workspaces for select
  to authenticated
  using (
    auth.uid() = owner_id or
    public.util__auth_user_is_workspace_member(id)
  );

create policy "User can INSERT workspaces that they own"
  on public.workspaces for insert
  to authenticated
  -- Anyone can create workspaces, but will still need to separately create:
  -- 1. the workspace_memberships row to link the user to the workspace
  -- 2. the user_details row for this user in this workspace
  -- 3. the user_roles row for this user in this workspace
  with check (auth.uid() = owner_id);

create policy "User can UPDATE workspaces they admin"
  on public.workspaces for update
  to authenticated
  using (public.util__auth_user_is_workspace_admin(id))
  with check (
    public.util__auth_user_is_workspace_admin(id) and
    public.util__user_is_workspace_member(owner_id, id)
  );

create policy "Owners can DELETE their workspaces"
  on public.workspaces for delete
  to authenticated
  using (public.util__auth_user_is_workspace_owner(id));

-- Policies: workspace_memberships
-- An UPDATE policy is intentionally not set. This table should only allow
-- adding users or removing users to a workspace.
create policy "User can SELECT their own memberships or memberships of other users in their workspace"
  on public.workspace_memberships for select
  to authenticated
  using (
    -- this membership belongs to the auth user
    user_id = auth.uid() or
    -- this membership belongs to a user that is in a workspace the
    -- authenticated user also belongs to. This allows authenticated
    -- users to also see who else is in their workspace, as well as
    -- their membership profile (such as name).
    public.util__auth_user_is_workspace_member(workspace_id)
  );

create policy "Owner can INSERT themselves as workspace members; Admin can INSERT other memberships"
  on public.workspace_memberships for insert
  to authenticated
  with check (
    (
      user_id = auth.uid() and
      public.util__auth_user_is_workspace_owner(workspace_id)
    ) or
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

create policy "User can DELETE their own memberships; Admin can DELETE other memberships"
  on public.workspace_memberships for delete
  to authenticated
  using (
    -- Users can remove themselves
    user_id = auth.uid() or
    -- Or admins can remove others
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

-- Policies: user_profiles
create policy "User can SELECT their own profiles or profiles of other workspace members"
  on public.user_profiles for select
  to authenticated
  using (
    user_id = auth.uid() or
    public.util__auth_user_is_workspace_member(workspace_id)
  );

create policy "Owner can INSERT their own user_profiles; Admin can INSERT other user_profiles"
  on public.user_profiles for insert
  to authenticated
  with check (
    (
      auth.uid() = public.user_profiles.user_id and
      public.util__auth_user_is_workspace_owner(workspace_id)
    ) or
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

create policy "User can UPDATE their own user_profiles; Admin can UPDATE other user_profiles"
  on public.user_profiles for update
  to authenticated
  using (
    (
      auth.uid() = user_id
      or public.util__auth_user_is_workspace_admin(workspace_id)
    )
  );

create policy "User can DELETE their own user_profiles; Admin can DELETE other user_profiles"
  on public.user_profiles for delete
  to authenticated
  using (
    auth.uid() = public.user_profiles.user_id
    or public.util__auth_user_is_workspace_admin(workspace_id)
  );

-- Policies: user_roles
create policy "User can SELECT their own user_roles or roles of other workspace members"
  on public.user_roles for select
  to authenticated
  using (
    user_id = auth.uid() or
    public.util__auth_user_is_workspace_member(workspace_id)
  );

create policy "Owner can INSERT their own user_roles; Admin can INSERT other user_roles"
  on public.user_roles for insert
  to authenticated
  with check (
    (
      auth.uid() = public.user_roles.user_id and
      public.util__auth_user_is_workspace_owner(workspace_id)
    ) or
    public.util__auth_user_is_workspace_admin(workspace_id)
  );

create policy "Admin can UPDATE other user_roles"
  on public.user_roles for update
  to authenticated
  using (
    public.util__auth_user_is_workspace_member(workspace_id)
  );

create policy "User can DELETE their own user_roles; Admin can DELETE other user_roles"
  on public.user_roles for delete
  to authenticated
  using (
    auth.uid() = public.user_roles.user_id
    or public.util__auth_user_is_workspace_admin(workspace_id)
  );
