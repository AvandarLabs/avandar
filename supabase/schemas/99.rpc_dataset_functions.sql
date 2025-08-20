create type public.dataset_column_input as (
  -- The name of the column
  name text,
  -- The description of the column
  description text,
  -- The data type of the column
  data_type public.datasets__column_data_type,
  -- The index of the column, so we can display columns in order in the UI
  column_idx integer
);

/**
 * Add a dataset to a given workspace.
 * This function should never be called directly and instead we should
 * always call one of the more specific functions such as
 * `rpc_datasets__add_google_sheets_dataset` or
 * `rpc_datasets__add_local_csv_dataset`.
 *
 * The requesting user must be an admin of the workspace.
 *
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
  -- Check the requesting user is an admin of the workspace.
  if (
    p_workspace_id != any(public.util__get_auth_user_workspaces_by_role('admin'))
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
    owner_id,
    owner_profile_id,
    workspace_id,
    name,
    description,
    source_type
  ) values (
    v_owner_id,
    v_owner_profile_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    p_dataset_source_type
  ) returning * into v_dataset;

  foreach v_column in array p_columns loop
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
      name,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.name,
      v_column.data_type,
      v_column.description,
      v_column.column_idx
    );
  end loop;
  return v_dataset;
end;
$$ language plpgsql security invoker;

/**
 * Add a Google Sheet dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__google_sheets.
 *
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_google_account_id: The google account id
 * @param p_google_document_id: The google document id (i.e. the ID within
 * Google's system. This is the ID you see in the URL when viewing a google
 * sheet)
 * @param p_rows_to_skip: The number of rows to skip
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_google_sheets_dataset (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_google_account_id text,
  p_google_document_id text,
  p_rows_to_skip integer default 0
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'google_sheets',
    p_columns
  );

  insert into public.datasets__google_sheets (
    dataset_id,
    workspace_id,
    google_account_id,
    google_document_id,
    rows_to_skip
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_google_account_id,
    p_google_document_id,
    p_rows_to_skip
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;

/**
 * Add a Local CSV dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__local_csv.
 *
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_delimiter: The delimiter of the CSV file
 * @param p_size_in_bytes: The size of the CSV file in bytes
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_local_csv_dataset (
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_delimiter text,
  p_size_in_bytes integer
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'local_csv',
    p_columns
  );

  insert into public.datasets__local_csv (
    dataset_id,
    workspace_id,
    delimiter,
    size_in_bytes
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_delimiter,
    p_size_in_bytes
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
