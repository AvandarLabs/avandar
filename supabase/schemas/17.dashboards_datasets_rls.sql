/**
 * RLS for `dashboards` and `datasets`. Lives in `17.*` so it runs after
 * `16.utils__permissions.sql` defines `util__auth_user_can_access_resource`.
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

create policy "Workspace managers can insert dashboards" on public.dashboards for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.dashboards.workspace_id
    ) and
    public.dashboards.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can update dashboards they have permissions for" on public.dashboards
for update
  to authenticated using (
    (
      public.util__can_manage_workspace_settings (
        public.dashboards.workspace_id
      ) or
      public.dashboards.owner_id = (
        select
          auth.uid ()
      )
    ) and
    public.util__auth_user_can_access_resource (
      'dashboard',
      public.dashboards.id,
      'viewer'
    )
  )
with
  check (
    (
      public.util__can_manage_workspace_settings (
        public.dashboards.workspace_id
      ) or
      public.dashboards.owner_id = (
        select
          auth.uid ()
      )
    ) and
    public.util__auth_user_can_access_resource (
      'dashboard',
      public.dashboards.id,
      'viewer'
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

create policy "User can delete dashboards they have permissions for" on public.dashboards for delete to authenticated using (
  (
    public.util__can_manage_workspace_settings (
      public.dashboards.workspace_id
    ) or
    public.dashboards.owner_id = (
      select
        auth.uid ()
    )
  ) and
  public.util__auth_user_can_access_resource (
    'dashboard',
    public.dashboards.id,
    'viewer'
  )
);

create policy "User can select datasets they have permissions for" on public.datasets for
select
  to authenticated using (
    public.util__auth_user_may_select_dataset (
      public.datasets.id
    )
  );

-- Matches `rpc_datasets__add_dataset`: workspace owner or Settings (global)
-- admin; row owner must be the caller (not delegated to another user id).
create policy "Workspace managers can insert datasets" on public.datasets for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.datasets.workspace_id
    ) and
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "User can update datasets they have permissions for" on public.datasets
for update
  to authenticated using (
    (
      public.util__can_manage_workspace_settings (
        public.datasets.workspace_id
      ) or
      public.datasets.owner_id = (
        select
          auth.uid ()
      )
    ) and
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets.id,
      'viewer'
    )
  )
with
  check (
    (
      public.util__can_manage_workspace_settings (
        public.datasets.workspace_id
      ) or
      public.datasets.owner_id = (
        select
          auth.uid ()
      )
    ) and
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets.id,
      'viewer'
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
  (
    public.util__can_manage_workspace_settings (
      public.datasets.workspace_id
    ) or
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  ) and
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets.id,
    'viewer'
  )
);
