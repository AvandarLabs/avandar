/**
 * RLS for `dashboards` and `datasets`. Lives in `17.*` so it runs after
 * `16.utils__permissions.sql` defines `util__auth_user_can_access_resource`.
 */
create policy "User can read dashboards" on public.dashboards for
select
  to authenticated,
  anon using (
    public.dashboards.is_public = true or
    (
      auth.uid () is not null and
      public.util__auth_user_can_access_resource (
        'dashboard',
        public.dashboards.id,
        'viewer'
      )
    )
  );

create policy "User can insert dashboards" on public.dashboards for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.dashboards.workspace_id,
      'dashboards',
      'editor'
    ) and
    public.dashboards.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can update dashboards" on public.dashboards
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dashboard',
      public.dashboards.id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dashboard',
      public.dashboards.id,
      'editor'
    )
  );

create policy "User can delete dashboards" on public.dashboards for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dashboard',
    public.dashboards.id,
    'editor'
  )
);

create policy "User can select datasets in their workspace" on public.datasets for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets.id,
      'viewer'
    )
  );

create policy "User can insert datasets in their workspace" on public.datasets for insert to authenticated
with
  check (
    public.util__auth_user_meets_min_app_role (
      public.datasets.workspace_id,
      'data_sources',
      'editor'
    ) and
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can update datasets in their workspace" on public.datasets
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets.id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets.id,
      'editor'
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

create policy "User can delete datasets in their workspace" on public.datasets for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets.id,
    'editor'
  )
);
