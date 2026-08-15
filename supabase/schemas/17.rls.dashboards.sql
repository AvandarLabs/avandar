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

-- The inline owner short-circuit lets the row owner pass SELECT RLS without the
-- helper re-fetching the row. Required so `INSERT ... RETURNING *` works for
-- the inserting user: during INSERT, the helper's internal SELECT cannot see
-- the just-inserted row and would otherwise return false.
create policy "Users can read dashboards they have permissions for" on public.dashboards for
select
  to authenticated using (
    public.dashboards.owner_id = (
      select
        auth.uid ()
    ) or
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
    ) and
    public.dashboards.snapshot_transition_kind is null
  );

create policy "Users with editor access can update dashboards" on public.dashboards
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    ) and
    (
      public.dashboards.snapshot_transition_kind is distinct from 'delete' or
      public.util__auth_user_can_delete_resource (
        'dashboard'::public.resource_type,
        public.dashboards.id
      )
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    ) and
    (
      public.dashboards.snapshot_transition_kind is distinct from 'delete' or
      public.util__auth_user_can_delete_resource (
        'dashboard'::public.resource_type,
        public.dashboards.id
      )
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
  ) and
  public.dashboards.snapshot_transition_kind = 'delete' and
  public.dashboards.snapshot_transition_revision is not null and
  public.dashboards.snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid and
  public.dashboards.snapshot_transition_revision is distinct from public.dashboards.snapshot_revision and
  public.dashboards.snapshot_transition_target_visibility is null and
  public.dashboards.snapshot_transition_prior_visibility is not null and
  public.dashboards.visibility = 'draft' and
  public.dashboards.snapshot_revision is not distinct from public.dashboards.snapshot_transition_prior_revision
);
