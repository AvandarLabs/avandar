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
          public.util__storage_object_dashboard_id (name)
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
