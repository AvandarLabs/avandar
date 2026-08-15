-- Keep private-target snapshots hidden until workspace visibility commits.
-- Editors retain read access while staging so transition retries and cleanup
-- can inspect the object they are allowed to update.
drop policy if exists "Users can SELECT private published datasets" on storage.objects;

create policy "Users can SELECT private published datasets" on storage.objects for
select
  to authenticated using (
    bucket_id = 'published-private' and
    (
      public.util__auth_user_can_update_resource (
        'dashboard'::public.resource_type,
        public.util__storage_object_dashboard_id (name)
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
            dashboards.visibility = 'workspace'::public.dashboard_visibility
        ) and
        public.util__auth_user_may_select_dashboard (
          public.util__storage_object_dashboard_id (name)
        )
      )
    )
  );
