create type public.dataset_column_input as (
  -- The original name of the column from the source data
  original_name text,
  -- The name of the column
  name text,
  -- The description of the column
  description text,
  -- The original data type of the column
  original_data_type text,
  -- The detected data type of the column, as inferred by DuckDB when parsing
  -- the dataset for the first time.
  detected_data_type public.datasets__duckdb_data_type,
  -- The queryable data type of the column
  data_type public.datasets__ava_data_type,
  -- The index of the column, so we can display columns in order in the UI
  column_idx integer
);

create type public.datasets__csv_file__date_format as (
  date_format text,
  timestamp_format text
);

/**
 * Add a dataset to a given workspace.
 * This function should never be called directly and instead we should
 * always call one of the more specific functions such as
 * `rpc_datasets__add_google_sheets_dataset` or
 * `rpc_datasets__add_csv_file_dataset`.
 *
 * The requesting user must be an admin of the workspace.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_dataset_source_type: The source type of the dataset
 * @param p_columns: The columns of the dataset
 *
 * @returns: The created dataset
 *
 * TODO(jpsyx): add this function to a private schema
 */
create or replace function public.rpc_datasets__add_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_dataset_source_type public.datasets__source_type,
  p_columns public.dataset_column_input[]
) returns public.datasets as $$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  -- Ensure the workspace is one that the user admins
  if (
    p_workspace_id != all(public.util__get_auth_user_workspaces_by_role('admin'))
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
$$ language plpgsql security invoker;
