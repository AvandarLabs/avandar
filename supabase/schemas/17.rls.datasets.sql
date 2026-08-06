/**
 *  RLS for `datasets`. Requires `16.utils.resource-permissions`.
 * 
 *  Resource CRUD matrix (effective role on the row):
 *    viewer: SELECT
 *    editor: SELECT, INSERT (new row in workspace), UPDATE
 *    admin: SELECT, INSERT, UPDATE, DELETE
 * 
 *  SELECT also uses `util__auth_user_may_select_dataset` so workspace editors
 *  cannot read other members' unrestricted rows without an explicit share.
 */
-- The inline owner short-circuit lets the row owner pass SELECT RLS without the
-- helper re-fetching the row. Required so `INSERT ... RETURNING *` works for
-- the inserting user: during INSERT, the helper's internal SELECT cannot see
-- the just-inserted row and would otherwise return false.
create policy "User can select datasets they have permissions for" on public.datasets for
select
  to authenticated using (
    public.datasets.owner_id = (
      select
        auth.uid ()
    ) or
    public.util__auth_user_may_select_dataset (
      public.datasets.id
    )
  );

create policy "Users with editor app role can insert datasets" on public.datasets for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.datasets.workspace_id,
      'dataset'::public.resource_type,
      public.datasets.owner_id
    )
  );

create policy "Users with editor access can update datasets" on public.datasets
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'dataset'::public.resource_type,
      public.datasets.id
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'dataset'::public.resource_type,
      public.datasets.id
    ) and
    public.datasets.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.datasets.workspace_id
          )
      )
    )
  );

create policy "Users with admin access can delete datasets" on public.datasets for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'dataset'::public.resource_type,
    public.datasets.id
  )
);
