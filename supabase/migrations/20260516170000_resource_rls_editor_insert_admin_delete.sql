--------------------------------------------------------------------------------
-- Resource RLS
--   viewer: SELECT
--   editor: INSERT, UPDATE
--   admin: DELETE
--------------------------------------------------------------------------------
create or replace function public.util__resource_type_to_app_type (
  p_resource_type public.resource_type
) returns public.app_type language sql immutable
set
  search_path = public as $$
  select case p_resource_type
    when 'dashboard'::public.resource_type then 'dashboards'::public.app_type
    when 'dataset'::public.resource_type then 'data_sources'::public.app_type
  end;
$$;

create or replace function public.util__auth_user_can_insert_workspace_resource (
  p_workspace_id uuid,
  p_resource_type public.resource_type,
  p_owner_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_app public.app_type;
begin
  if v_uid is null or p_owner_id is distinct from v_uid then
    return false;
  end if;

  if not (
    p_workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  v_app := public.util__resource_type_to_app_type (p_resource_type);

  return public.util__auth_user_meets_min_app_role (
    p_workspace_id,
    v_app,
    'editor'::public.role_level
  );
end;
$$;

create or replace function public.util__auth_user_can_update_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.util__auth_user_can_access_resource (
    p_resource_type,
    p_resource_id,
    'editor'::public.role_level
  );
$$;

create or replace function public.util__auth_user_can_delete_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.util__auth_user_can_access_resource (
    p_resource_type,
    p_resource_id,
    'admin'::public.role_level
  );
$$;

-- dashboards
drop policy if exists "Workspace managers can insert dashboards" on public.dashboards;

drop policy if exists "User can update dashboards they have permissions for" on public.dashboards;

drop policy if exists "User can delete dashboards they have permissions for" on public.dashboards;

create policy "Users with editor app role can insert dashboards" on public.dashboards for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.dashboards.workspace_id,
      'dashboard'::public.resource_type,
      public.dashboards.owner_id
    )
  );

create policy "Users with editor access can update dashboards" on public.dashboards
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      public.dashboards.id
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
  )
);

-- datasets
drop policy if exists "Workspace managers can insert datasets" on public.datasets;

drop policy if exists "User can update datasets they have permissions for" on public.datasets;

drop policy if exists "User can delete datasets in their workspace" on public.datasets;

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

-- dataset child tables: DELETE requires admin on parent dataset
drop policy if exists "User can delete dataset_columns in their workspace" on public.dataset_columns;

create policy "User can delete dataset_columns in their workspace" on public.dataset_columns for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.dataset_columns.dataset_id,
    'admin'
  )
);

drop policy if exists "User can delete datasets__csv_file in their workspace" on public.datasets__csv_file;

create policy "User can delete datasets__csv_file in their workspace" on public.datasets__csv_file for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__csv_file.dataset_id,
    'admin'
  )
);

drop policy if exists "User can delete datasets__virtual in their workspace" on public.datasets__virtual;

create policy "User can delete datasets__virtual in their workspace" on public.datasets__virtual for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__virtual.dataset_id,
    'admin'
  )
);

drop policy if exists "User can delete datasets__open_data in their workspace" on public.datasets__open_data;

create policy "User can delete datasets__open_data in their workspace" on public.datasets__open_data for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__open_data.dataset_id,
    'admin'
  )
);

drop policy if exists "User can delete datasets__google_sheets in their workspace" on public.datasets__google_sheets;

create policy "User can delete datasets__google_sheets in their workspace" on public.datasets__google_sheets for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__google_sheets.dataset_id,
    'admin'
  )
);

drop policy if exists "User can delete datasets__xlsx_file in their workspace" on public.datasets__xlsx_file;

create policy "User can delete datasets__xlsx_file in their workspace" on public.datasets__xlsx_file for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__xlsx_file.dataset_id,
    'admin'
  )
);
