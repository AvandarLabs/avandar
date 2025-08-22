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
  );
