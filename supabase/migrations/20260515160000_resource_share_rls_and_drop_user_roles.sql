-- Resource share RLS: resource admins may manage shares and tags.
-- Drop legacy user_roles table (role groups are canonical).
drop policy if exists "Settings admins can insert resource_shares" on public.resource_shares;

drop policy if exists "Settings admins can update resource_shares" on public.resource_shares;

drop policy if exists "Settings admins can delete resource_shares" on public.resource_shares;

create policy "Resource admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  );

create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  )
with
  check (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  );

create policy "Resource admins can delete resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (
    workspace_id
  ) or
  public.util__auth_user_can_access_resource (
    resource_type,
    resource_id,
    'admin'
  )
);

drop policy if exists "Settings admins can insert resource_user_group_tags" on public.resource_user_group_tags;

drop policy if exists "Settings admins can update resource_user_group_tags" on public.resource_user_group_tags;

drop policy if exists "Settings admins can delete resource_user_group_tags" on public.resource_user_group_tags;

create policy "Resource admins can insert resource_user_group_tags" on public.resource_user_group_tags for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  );

create policy "Resource admins can update resource_user_group_tags" on public.resource_user_group_tags
for update
  to authenticated using (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  )
with
  check (
    public.util__is_settings_admin (
      workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      resource_type,
      resource_id,
      'admin'
    )
  );

create policy "Resource admins can delete resource_user_group_tags" on public.resource_user_group_tags for delete to authenticated using (
  public.util__is_settings_admin (
    workspace_id
  ) or
  public.util__auth_user_can_access_resource (
    resource_type,
    resource_id,
    'admin'
  )
);

drop policy if exists "Users can select user roles in their workspaces" on public.user_roles;

drop policy if exists "Users can insert user roles in their workspaces" on public.user_roles;

drop policy if exists "Admins can update user roles in their workspaces" on public.user_roles;

drop policy if exists "Users can DELETE user roles" on public.user_roles;

drop trigger if exists tr_user_roles__prevent_id_changes on public.user_roles;

drop trigger if exists tr_user_roles__set_updated_at on public.user_roles;

drop function if exists public.user_roles__prevent_id_changes ();

drop table if exists public.user_roles;

drop function if exists public.util__get_auth_user_workspaces_by_role (text);
