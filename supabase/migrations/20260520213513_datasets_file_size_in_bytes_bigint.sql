drop function if exists "public"."rpc_datasets__add_csv_file_dataset" (
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
);

drop function if exists "public"."rpc_datasets__add_xlsx_file_dataset" (
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
);

alter table "public"."datasets__csv_file"
alter column "size_in_bytes"
set data type bigint using "size_in_bytes"::bigint;

alter table "public"."datasets__xlsx_file"
alter column "size_in_bytes"
set data type bigint using "size_in_bytes"::bigint;

set
  check_function_bodies = off;

create or replace function public.rpc_datasets__add_csv_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes bigint,
  p_rows_to_skip integer,
  p_quote_char public.util__nullable_text,
  p_escape_char public.util__nullable_text,
  p_delimiter text,
  p_newline_delimiter text,
  p_comment_char public.util__nullable_text,
  p_has_header boolean,
  p_date_format public.datasets__csv_file__date_format
) returns public.datasets language plpgsql as $function$
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
$function$;

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
) returns public.datasets language plpgsql as $function$
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
$function$;
