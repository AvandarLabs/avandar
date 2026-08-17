/**
 *  RLS for `resource_shares`. Requires `16.utils.resource-permissions`.
 *
 *  Resource admins may manage shares and tags. In other words, the admin of
 *  a resource (such as a dataset or a dashboard) can manage who to share it
 *  with.
 *
 *  The workspace-wide Settings-Admin grant on INSERT and UPDATE is gated on the
 *  resource NOT being private to its owner. Without that gate an admin could
 *  insert a share granting themselves admin on a private resource, which would
 *  make it non-private and readable: a two-statement self-escalation. The owner
 *  workspace-bound resource-admin path still lets the owner share their own
 *  private resource, which is how it stops being private.
 *
 *  DELETE is deliberately not gated: removing a share can only reduce access.
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
    public.util__auth_user_can_access_resource_in_workspace (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      public.resource_shares.workspace_id,
      'admin'
    )
  );

create policy "Resource admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    public.util__auth_user_can_access_resource_in_workspace (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      public.resource_shares.workspace_id,
      'admin'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource_in_workspace (
      public.resource_shares.resource_type,
      public.resource_shares.resource_id,
      public.resource_shares.workspace_id,
      'admin'
    )
  );

create policy "Resource admins can delete resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (public.resource_shares.workspace_id) or
  public.util__auth_user_can_access_resource (
    public.resource_shares.resource_type,
    public.resource_shares.resource_id,
    'admin'
  )
);
