-- Depends on 20260504000010: `xlsx_file` enum value must exist in a prior txn.
update public.datasets
set
  source_type = 'xlsx_file'
where
  source_type = 'xls_file';

drop function if exists public.rpc_datasets__add_xls_file_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  boolean,
  integer,
  integer,
  public.util__nullable_text,
  boolean,
  public.datasets__csv_file__date_format
);

alter table public.datasets__xls_file
rename to datasets__xlsx_file;

alter trigger tr_datasets__xls_file__set_updated_at on public.datasets__xlsx_file
rename to tr_datasets__xlsx_file__set_updated_at;

create or replace function public.rpc_datasets__add_xlsx_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes integer,
  p_rows_to_skip integer,
  p_sheet_name public.util__nullable_text,
  p_has_header boolean,
  p_date_format public.datasets__csv_file__date_format
) returns public.datasets language plpgsql security invoker as $$
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
$$;
