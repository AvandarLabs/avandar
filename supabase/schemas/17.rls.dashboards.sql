/**
 * RLS for `dashboards`. Requires `16.utils.resource-permissions`.
 *
 * Resource CRUD matrix (effective role on the row):
 *   viewer: SELECT
 *   editor: SELECT, INSERT (new row in workspace), UPDATE
 *   admin: SELECT, INSERT, UPDATE, DELETE
 *
 * The role is necessary but no longer sufficient. The durable snapshot
 * transition in `10.dashboards.sql` adds a state requirement to three of the
 * four verbs:
 *
 *   SELECT - also uses `util__auth_user_may_select_dashboard`, so workspace
 *            editors cannot read other members' unrestricted rows without an
 *            explicit share, and a `draft` needs edit rights rather than mere
 *            read access.
 *   INSERT - draft-only, and with no transition claim. A dashboard can reach
 *            `workspace` or `public` only through the guarded two-step
 *            transition, never by being born there.
 *   UPDATE - editor rights, EXCEPT on a row already claimed for `delete`,
 *            which takes delete rights. Otherwise an editor could settle or
 *            interfere with an admin's pending delete.
 *   DELETE - admin rights AND a settled `delete` claim on the row. A dashboard
 *            cannot be removed until its snapshot objects have been cleaned up
 *            under that claim.
 */
create policy "Anon can read public dashboards" on public.dashboards for
select
  to anon using (public.dashboards.is_public = true);

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
    public.util__auth_user_may_select_dashboard (public.dashboards.id)
  );

create policy "Users with editor app role can insert dashboards" on public.dashboards for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.dashboards.workspace_id,
      'dashboard'::public.resource_type,
      public.dashboards.owner_id
    ) and
    public.dashboards.snapshot_transition_kind is null and
    -- A dashboard is always born a draft. Publication is reachable only through
    -- the guarded two-step snapshot transition, so
    -- `tr__dashboards__enforce_publish_publicly` does not have to be duplicated
    -- for INSERT. Without this, a plain editor could insert a row that is
    -- already `public`, which is anon-readable, squats the global slug
    -- namespace, and can point at a chosen `snapshot_revision`.
    public.dashboards.visibility = 'draft'::public.dashboard_visibility
  );

create policy "Users with editor access can update dashboards" on public.dashboards
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    ) and
    (
      public.dashboards.snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind or
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
      public.dashboards.snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind or
      public.util__auth_user_can_delete_resource (
        'dashboard'::public.resource_type,
        public.dashboards.id
      )
    ) and
    public.dashboards.owner_id = any (
      array(
        select
          public.util__get_workspace_members (public.dashboards.workspace_id)
      )
    )
  );

-- Deleting a dashboard is the last step of a `delete` transition, never a
-- standalone act. Admin rights alone are not enough: the row must already hold
-- a well-formed `delete` claim, which is what proves the caller went through
-- `10.dashboards.sql`'s claim path and cleaned up the snapshot objects first.
-- Without the state requirement an admin could drop the row outright and
-- orphan every object in `published` / `published-private`, since the storage
-- policies identify an object's owner by parsing the dashboard id out of its
-- path and would no longer find a row to authorise against.
--
-- The seven trailing conjuncts restate
-- `dashboards__snapshot_transition_consistent`'s `delete` arm verbatim, and the
-- duplication is deliberate defense in depth rather than an oversight. The
-- CHECK constrains what may be WRITTEN and cannot be consulted by a policy;
-- this restates the same shape as a precondition on the READ side of DELETE,
-- so weakening or dropping the constraint does not silently widen who can
-- remove a row. Keep the two in step: any change to that arm belongs here too.
create policy "Users with admin access can delete dashboards" on public.dashboards for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'dashboard'::public.resource_type,
    public.dashboards.id
  ) and
  public.dashboards.snapshot_transition_kind = 'delete'::public.dashboard_snapshot_transition_kind and
  public.dashboards.snapshot_transition_revision is not null and
  public.dashboards.snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid and
  public.dashboards.snapshot_transition_revision is distinct from public.dashboards.snapshot_revision and
  public.dashboards.snapshot_transition_target_visibility is null and
  public.dashboards.snapshot_transition_prior_visibility is not null and
  public.dashboards.visibility = 'draft'::public.dashboard_visibility and
  public.dashboards.snapshot_revision is not distinct from public.dashboards.snapshot_transition_prior_revision
);
