-- Storage for dashboard snapshots: the two buckets and their nine policies.
--
-- This is the fold of seven drafting `_STORAGE` migrations that each dropped
-- and recreated overlapping subsets of the same nine policies; the last of them
-- fully superseded the other six. Each policy is written once, in its final
-- form.
--
-- Storage-only by rule, so it is safe to replay: it is listed in
-- `[db.seed] sql_paths`, which re-runs it AFTER the migration pass and makes it
-- the last word on the storage schema for a local database. Every statement is
-- therefore idempotent (`on conflict`, `drop policy if exists`). The `public`
-- and `private` helpers these policies call are defined in the non-storage
-- migrations before it.
--
-- `published` holds snapshots of dashboards published to the open internet;
-- `published-private` holds snapshots published only to a workspace. Both
-- buckets are PRIVATE, because a bucket created with `public = true` is served
-- through a path that never consults storage.objects RLS at all. The `on
-- conflict do update` re-asserts that on a database where an earlier run
-- created either bucket public.
--
-- "Anyone can SELECT published datasets" is dropped and deliberately not
-- recreated: it was the pre-revision policy that exposed every object in
-- `published` to `anon` with no dashboard-state check at all.
insert into
  storage.buckets (
    id,
    name,
    public
  )
values
  (
    'published',
    'published',
    false
  ),
  (
    'published-private',
    'published-private',
    false
  )
on conflict (id) do update
set
  public = excluded.public;

drop policy if exists "Anyone can SELECT published datasets" on storage.objects;

drop policy if exists "Anonymous users can SELECT public dashboard datasets" on storage.objects;

drop policy if exists "Authorized users can SELECT published dashboard datasets" on storage.objects;

drop policy if exists "Users can SELECT private published datasets" on storage.objects;

drop policy if exists "Authenticated users can DELETE published datasets" on storage.objects;

drop policy if exists "Authenticated users can UPDATE published datasets" on storage.objects;

drop policy if exists "Authenticated users can UPLOAD published datasets" on storage.objects;

drop policy if exists "Users can DELETE private published datasets" on storage.objects;

drop policy if exists "Users can UPDATE private published datasets" on storage.objects;

drop policy if exists "Users can UPLOAD private published datasets" on storage.objects;

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
        dashboards.id = public.util__storage_object_dashboard_id (
          storage.objects.name
        ) and
        dashboards.visibility = 'public'::public.dashboard_visibility and
        dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (
          storage.objects.name
        )
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
          dashboards.id = public.util__storage_object_dashboard_id (
            storage.objects.name
          ) and
          dashboards.snapshot_transition_kind in (
            'publish',
            'abort_publish'
          ) and
          dashboards.snapshot_transition_revision = public.util__storage_object_snapshot_revision (
            storage.objects.name
          ) and
          dashboards.snapshot_transition_target_visibility = 'public' and
          public.util__auth_user_can_update_resource (
            'dashboard'::public.resource_type,
            dashboards.id
          ) and
          public.util__auth_user_may_select_dashboard (
            dashboards.id
          )
      ) or
      (
        exists (
          select
            1
          from
            public.dashboards
          where
            dashboards.id = public.util__storage_object_dashboard_id (
              storage.objects.name
            ) and
            dashboards.visibility = 'public'::public.dashboard_visibility and
            dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (
              storage.objects.name
            )
        ) and
        public.util__auth_user_may_select_dashboard (
          public.util__storage_object_dashboard_id (
            storage.objects.name
          )
        )
      )
    )
  );

create policy "Authenticated users can DELETE published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published' and
  private.util__auth_user_can_delete_dashboard_snapshot_object (
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

create policy "Authenticated users can UPLOAD published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );

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
          dashboards.id = public.util__storage_object_dashboard_id (
            storage.objects.name
          ) and
          dashboards.snapshot_transition_kind in (
            'publish',
            'abort_publish'
          ) and
          dashboards.snapshot_transition_revision = public.util__storage_object_snapshot_revision (
            storage.objects.name
          ) and
          dashboards.snapshot_transition_target_visibility = 'workspace' and
          public.util__auth_user_can_update_resource (
            'dashboard'::public.resource_type,
            dashboards.id
          ) and
          public.util__auth_user_may_select_dashboard (
            dashboards.id
          )
      ) or
      (
        exists (
          select
            1
          from
            public.dashboards
          where
            dashboards.id = public.util__storage_object_dashboard_id (
              storage.objects.name
            ) and
            dashboards.visibility = 'workspace'::public.dashboard_visibility and
            dashboards.snapshot_revision = public.util__storage_object_snapshot_revision (
              storage.objects.name
            )
        ) and
        public.util__auth_user_may_select_dashboard (
          public.util__storage_object_dashboard_id (storage.objects.name)
        )
      )
    )
  );

create policy "Users can DELETE private published datasets" on storage.objects for delete to authenticated using (
  bucket_id = 'published-private' and
  private.util__auth_user_can_delete_dashboard_snapshot_object (
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

create policy "Users can UPLOAD private published datasets" on storage.objects for insert to authenticated
with
  check (
    bucket_id = 'published-private' and
    private.util__auth_user_can_write_dashboard_snapshot_object (
      storage.objects.bucket_id,
      storage.objects.name
    )
  );
