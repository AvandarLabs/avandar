/**
 * Add an Excel (.xlsx) file dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__xlsx_file.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_is_in_cloud_storage: Whether the raw file is stored in cloud storage
 * @param p_size_in_bytes: The size of the file in bytes
 * @param p_rows_to_skip: The number of rows to skip at the top of the sheet
 * @param p_sheet_name: The worksheet name that was imported (nullable wrapper)
 * @param p_has_header: Whether the worksheet has a header row
 * @param p_date_format: Date and timestamp format hints for parsing
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_xlsx_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes bigint,
  p_rows_to_skip integer,
  p_sheet_name public.util__nullable_text,
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
    'xlsx_file',
    p_columns
  );

  insert into public.datasets__xlsx_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    rows_to_skip,
    sheet_name,
    has_header,
    date_format,
    timestamp_format
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_rows_to_skip,
    p_sheet_name.value,
    p_has_header,
    p_date_format.date_format,
    p_date_format.timestamp_format
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
