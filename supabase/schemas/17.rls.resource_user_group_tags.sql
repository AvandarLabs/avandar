create policy "Members can select resource_user_group_tags" on public.resource_user_group_tags for
select
  to authenticated using (
    public.resource_user_group_tags.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Resource admins can insert resource_user_group_tags" on public.resource_user_group_tags for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_user_group_tags.resource_type,
      public.resource_user_group_tags.resource_id,
      'admin'
    )
  );

create policy "Resource admins can update resource_user_group_tags" on public.resource_user_group_tags
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_user_group_tags.resource_type,
      public.resource_user_group_tags.resource_id,
      'admin'
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_user_group_tags.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_user_group_tags.resource_type,
      public.resource_user_group_tags.resource_id,
      'admin'
    )
  );

create policy "Resource admins can delete resource_user_group_tags" on public.resource_user_group_tags for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_user_group_tags.workspace_id
  ) or
  public.util__auth_user_can_access_resource (
    public.resource_user_group_tags.resource_type,
    public.resource_user_group_tags.resource_id,
    'admin'
  )
);
