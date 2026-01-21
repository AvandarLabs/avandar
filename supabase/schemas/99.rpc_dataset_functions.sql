create type public.dataset_column_input as (
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
      original_data_type,
      detected_data_type,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
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

/**
 * Add a Google Sheet dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__google_sheets.
 *
 * @param p_dataset_id: The id of the dataset to add
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
  p_dataset_id uuid,
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
    p_dataset_id,
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
 * datasets__csv_file.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_size_in_bytes: The size of the CSV file in bytes
 * @param p_rows_to_skip: The number of rows to skip
 * @param p_quote_char: The quote character of the CSV file
 * @param p_escape_char: The escape character of the CSV file
 * @param p_delimiter: The delimiter of the CSV file
 * @param p_newline_delimiter: The newline delimiter of the CSV file
 * @param p_comment_char: The comment character of the CSV file
 * @param p_has_header: Whether the CSV file has a header
 * @param p_date_format: the `date_format` and `timestamp_format` of the
 * CSV file.
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_csv_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes integer,
  p_rows_to_skip integer,
  p_quote_char public.util__nullable_text,
  p_escape_char public.util__nullable_text,
  p_delimiter text,
  p_newline_delimiter text,
  p_comment_char public.util__nullable_text,
  p_has_header boolean,
  p_date_format public.datasets__csv_file__date_format
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'csv_file',
    p_columns
  );

  insert into public.datasets__csv_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    rows_to_skip,
    quote_char,
    escape_char,
    delimiter,
    newline_delimiter,
    comment_char,
    has_header,
    date_format,
    timestamp_format
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_rows_to_skip,
    p_quote_char.value,
    p_escape_char.value,
    p_delimiter,
    p_newline_delimiter,
    p_comment_char.value,
    p_has_header,
    p_date_format.date_format,
    p_date_format.timestamp_format
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
