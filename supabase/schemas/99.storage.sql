/**
 * Declarative mirror of every policy on `storage.objects`.
 *
 * This file creates nothing that the `_STORAGE`-prefixed migrations do not
 * already create. It exists so `supabase db diff` knows these policies are
 * intentional. Without it, diff compares the live database, which has the
 * policies, against `supabase/schemas/`, which would not, and writes a
 * migration that DROPS them. Four migrations did exactly that before this
 * mirror existed, none of them recreating what they dropped, which left every
 * database built from migrations alone with no `storage.objects` policies at
 * all. `20260813214231_STORAGE-restore-dropped-object-policies.sql` repaired
 * that timeline.
 *
 * Do not assume a local database would surface the same damage. Measured on
 * CLI v2.98.2, `db reset` does NOT wipe the storage schema, so the
 * `[db.seed] sql_paths` replay is not what restores these policies.
 *
 * Buckets themselves are deliberately absent here: `insert into
 * storage.buckets` is DML, which diff does not track. The `_STORAGE`
 * migrations assert buckets instead.
 *
 * Numbered 99 rather than 100 so it sorts LAST. Schema files are applied in
 * lexicographic order, in which "100." sorts between "10." and "15.". That
 * would place these policies ahead of `16.utils.resource-permissions.sql`,
 * which defines the helpers they call, and the build would fail.
 *
 * Requires `16.utils.resource-permissions`.
 *
 * Keep in sync with the `_STORAGE` migrations. `supabase db diff` must return
 * empty; any output means this mirror has drifted.
 */
--
-- Bucket `workspaces` (private). Gated on dataset-level access, not mere
-- workspace membership: viewer to read, editor to write. See
-- 20260813151500_STORAGE-gate-workspaces-bucket-on-dataset-access.sql for why
-- the dataset id has to be parsed out of the object name.
--
create policy "Users can SELECT workspace datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'workspaces' and
    (storage.foldername (name)) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (storage.foldername (name)) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'viewer'::public.role_level
    )
  );

create policy "Users can UPLOAD workspace datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'workspaces' and
    (storage.foldername (name)) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (storage.foldername (name)) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  );

create policy "Users can UPDATE workspace datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'workspaces' and
    (storage.foldername (name)) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (storage.foldername (name)) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  )
with
  check (
    bucket_id = 'workspaces' and
    (storage.foldername (name)) [1] = any (
      array(
        select
          unnest(
            public.util__get_auth_user_workspaces ()
          )::text
      )
    ) and
    (storage.foldername (name)) [2] = 'datasets' and
    public.util__storage_object_dataset_id (name) is not null and
    public.util__storage_object_workspace_id (name) is not null and
    public.util__auth_user_can_access_resource_in_workspace (
      'dataset'::public.resource_type,
      public.util__storage_object_dataset_id (name),
      public.util__storage_object_workspace_id (name),
      'editor'::public.role_level
    )
  );

create policy "Users can DELETE workspace datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'workspaces' and
  (storage.foldername (name)) [1] = any (
    array(
      select
        unnest(
          public.util__get_auth_user_workspaces ()
        )::text
    )
  ) and
  (storage.foldername (name)) [2] = 'datasets' and
  public.util__storage_object_dataset_id (name) is not null and
  public.util__storage_object_workspace_id (name) is not null and
  public.util__auth_user_can_access_resource_in_workspace (
    'dataset'::public.resource_type,
    public.util__storage_object_dataset_id (name),
    public.util__storage_object_workspace_id (name),
    'editor'::public.role_level
  )
);

--
-- Bucket `published` (private, world-readable only through RLS after the
-- associated dashboard row has committed public visibility and the matching
-- revision). Editors can read only the exact active staged object generation so
-- Storage upsert remains retryable without exposing committed snapshots they
-- cannot select. Keeping the bucket private prevents every other download from
-- bypassing these SELECT gates.
--
-- Write access requires edit rights on the dashboard parsed from the object
-- path, preventing cross-dashboard snapshot changes.
--
create policy "Anonymous users can SELECT public dashboard datasets" on storage.objects for
select
  to anon using (
    bucket_id = 'published' and
    exists (
      select
        1
      from
        public.dashboards
      where
        dashboards.id = public.util__storage_object_dashboard_id (storage.objects.name) and
        dashboards.visibility = 'public'::public.dashboard_visibility and
        dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (storage.objects.name)
    )
  );

create policy "Authorized users can SELECT published dashboard datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'published' and
    (
      exists (
        select
          1
        from
          public.dashboards
        where
          dashboards.id = public.util__storage_object_dashboard_id (storage.objects.name) and
          dashboards.snapshot_transition_kind in ('publish', 'abort_publish') and
          dashboards.snapshot_transition_revision = public.util__storage_object_snapshot_revision (storage.objects.name) and
          dashboards.snapshot_transition_target_visibility = 'public' and
          public.util__auth_user_can_update_resource (
            'dashboard'::public.resource_type,
            dashboards.id
          ) and
          public.util__auth_user_may_select_dashboard (dashboards.id)
      ) or
      (
        exists (
          select
            1
          from
            public.dashboards
          where
            dashboards.id = public.util__storage_object_dashboard_id (storage.objects.name) and
            dashboards.visibility = 'public'::public.dashboard_visibility and
            dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (storage.objects.name)
        ) and
        public.util__auth_user_may_select_dashboard (
          public.util__storage_object_dashboard_id (storage.objects.name)
        )
      )
    )
  );

create policy "Authenticated users can UPLOAD published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );

create policy "Authenticated users can UPDATE published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  )
with
  check (
    bucket_id = 'published' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );

create policy "Authenticated users can DELETE published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published' and
  private.util__auth_user_can_delete_dashboard_snapshot_object (
    storage.objects.bucket_id,
    storage.objects.name
  )
);

--
-- Bucket `published-private` (workspace-only snapshots). Same object paths as
-- `published`; only the bucket varies with visibility. Editors may read staged
-- objects for the exact active publish claim. Viewer-level access starts only
-- after the dashboard commits workspace visibility.
--
create policy "Users can SELECT private published datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'published-private' and
    (
      exists (
        select
          1
        from
          public.dashboards
        where
          dashboards.id = public.util__storage_object_dashboard_id (storage.objects.name) and
          dashboards.snapshot_transition_kind in ('publish', 'abort_publish') and
          dashboards.snapshot_transition_revision = public.util__storage_object_snapshot_revision (storage.objects.name) and
          dashboards.snapshot_transition_target_visibility = 'workspace' and
          public.util__auth_user_can_update_resource (
            'dashboard'::public.resource_type,
            dashboards.id
          ) and
          public.util__auth_user_may_select_dashboard (dashboards.id)
      ) or
      (
        exists (
          select
            1
          from
            public.dashboards
          where
            dashboards.id = public.util__storage_object_dashboard_id (storage.objects.name) and
            dashboards.visibility = 'workspace'::public.dashboard_visibility and
            dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (storage.objects.name)
        ) and
        public.util__auth_user_may_select_dashboard (
          public.util__storage_object_dashboard_id (storage.objects.name)
        )
      )
    )
  );

create policy "Users can UPLOAD private published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published-private' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );

create policy "Users can UPDATE private published datasets" on storage.objects
for update
  to authenticated using (
    bucket_id = 'published-private' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  )
with
  check (
    bucket_id = 'published-private' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );

create policy "Users can DELETE private published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published-private' and
  private.util__auth_user_can_delete_dashboard_snapshot_object (
    storage.objects.bucket_id,
    storage.objects.name
  )
);

--
-- Bucket `opendata` (public catalogue data). No path-shape restriction: the
-- whole bucket is public read, authenticated write.
--
create policy "Anyone can select open data datasets" on storage.objects for
select
  to authenticated,
  anon using (bucket_id = 'opendata');

create policy "Auth users can upload open data datasets" on storage.objects for insert to authenticated
with
  check (bucket_id = 'opendata');

create policy "Auth users can update open data datasets" on storage.objects
for update
  to authenticated using (bucket_id = 'opendata')
with
  check (bucket_id = 'opendata');
