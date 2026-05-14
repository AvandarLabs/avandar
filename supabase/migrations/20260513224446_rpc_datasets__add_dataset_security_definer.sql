set
  check_function_bodies = off;

-- Repair environments that applied the reverted `util__rls_auth_uid`
-- experiment (migration file removed from the repo).
drop policy if exists "User can insert dashboards" on public.dashboards;

drop policy if exists "User can insert datasets in their workspace" on public.datasets;

drop policy if exists "Workspace owners can insert datasets" on public.datasets;

drop policy if exists "Workspace settings managers can insert datasets" on public.datasets;

drop function if exists public.util__rls_auth_uid ();

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

create policy "Workspace owners can insert datasets" on public.datasets for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.workspaces w
      where
        w.id = public.datasets.workspace_id and
        w.owner_id = auth.uid ()
    ) and
    public.datasets.owner_id = (
      select
        auth.uid ()
    )
  );

create policy "Workspace settings managers can insert datasets" on public.datasets for insert to authenticated
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

create or replace function public.rpc_datasets__add_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type public.datasets__source_type,
  p_columns public.dataset_column_input[]
) returns public.datasets language plpgsql security definer
set
  search_path to 'public' as $function$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  -- Ensure the workspace is one that the user admins
  if (
    not public.util__can_manage_workspace_settings (p_workspace_id)
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  -- Get the owner profile id
  select public.user_profiles.id into v_owner_profile_id
  from public.user_profiles
  where
    public.user_profiles.user_id = v_owner_id
    and public.user_profiles.workspace_id = p_workspace_id;

  -- Create the dataset
  insert into public.datasets (
    id,
    owner_id,
    owner_profile_id,
    workspace_id,
    name,
    description,
    source_type
  ) values (
    p_dataset_id,
    v_owner_id,
    v_owner_profile_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    p_dataset_source_type
  ) returning * into v_dataset;

  foreach v_column in array p_columns loop
    if v_column.original_name is null then
      raise exception 'Column original name is required';
    end if;
    if v_column.name is null then
      raise exception 'Column name is required';
    end if;
    if v_column.data_type is null then
      raise exception 'Column data type is required';
    end if;
    if v_column.column_idx is null then
      raise exception 'Column index is required';
    end if;

    insert into public.dataset_columns (
      dataset_id,
      workspace_id,
      original_name,
      name,
      original_data_type,
      detected_data_type,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.original_name,
      v_column.name,
      v_column.original_data_type,
      v_column.detected_data_type,
      v_column.data_type,
      v_column.description,
      v_column.column_idx
    );
  end loop;
  return v_dataset;
end;
$function$;
