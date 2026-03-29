/**
 * Add a CSV file dataset to a workspace.
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
