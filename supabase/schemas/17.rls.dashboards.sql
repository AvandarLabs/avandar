/**
 * RLS for `dashboards`. Requires `16.utils.resource-permissions`.
 *
 *  Resource CRUD matrix (effective role on the row):
 *    viewer: SELECT
 *    editor: SELECT, INSERT (new row in workspace), UPDATE
 *    admin: SELECT, INSERT, UPDATE, DELETE
 * 
 *  SELECT also uses `util__auth_user_may_select_dashboard` so workspace editors
 * cannot read other members' unrestricted rows without an explicit share.
 */
create policy "Anon can read public dashboards" on public.dashboards for
select
  to anon using (
    public.dashboards.is_public = true
  );

create policy "Users can read dashboards they have permissions for" on public.dashboards for
select
  to authenticated using (
    public.util__auth_user_may_select_dashboard (
      public.dashboards.id
    )
  );

create policy "Users with editor app role can insert dashboards" on public.dashboards for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.dashboards.workspace_id,
      'dashboard'::public.resource_type,
      public.dashboards.owner_id
    )
  );

create policy "Users with editor access can update dashboards" on public.dashboards
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    ) and
    public.dashboards.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.dashboards.workspace_id
          )
      )
    )
  );

create policy "Users with admin access can delete dashboards" on public.dashboards for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'dashboard'::public.resource_type,
    public.dashboards.id
  )
);
