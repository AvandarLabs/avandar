-- Keep staged public-target snapshots behind RLS until the dashboard row's
-- visibility update commits. A public Storage bucket bypasses object SELECT
-- policies, so the bucket itself must be private in addition to this policy.
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
  )
on conflict (id) do update
set
  public = excluded.public;

drop policy if exists "Anyone can SELECT published datasets" on storage.objects;

drop policy if exists "Anyone can SELECT public dashboard datasets" on storage.objects;

drop policy if exists "Anonymous users can SELECT public dashboard datasets" on storage.objects;

drop policy if exists "Authorized users can SELECT published dashboard datasets" on storage.objects;

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
        dashboards.visibility = 'public'::public.dashboard_visibility
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
          dashboards.visibility = 'public'::public.dashboard_visibility
      ) or
      public.util__auth_user_may_select_dashboard (
        public.util__storage_object_dashboard_id (
          storage.objects.name
        )
      )
    )
  );
