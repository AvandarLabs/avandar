/**
 *  RLS for `resource_shares`. Requires `16.utils.resource-permissions`.
 * 
 *  Resource admins may manage shares and tags. In other words, the admin of
 *  a resource (such as a dataset or a dashboard) can manage who to share it
 *  with.
 */
create policy "Members can select resource_shares in their workspaces" on public.resource_shares for
select
  to authenticated using (
    public.resource_shares.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Resource admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );

create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    ) or
    public.util__auth_user_can_access_resource (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      'admin'
    )
  );

create policy "Resource admins can delete resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_shares.workspace_id
  ) or
  public.util__auth_user_can_access_resource (
    public.resource_shares.resource_type,
    public.resource_shares.resource_id,
    'admin'
  )
);
