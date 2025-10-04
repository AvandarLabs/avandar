drop function if exists "public"."rpc_datasets__add_csv_file_dataset"(p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_size_in_bytes integer, p_rows_to_skip integer, p_quote_char text, p_escape_char text, p_delimiter text, p_newline_delimiter text, p_comment_char util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format);

alter table "public"."datasets__csv_file" alter column "escape_char" drop default;

alter table "public"."datasets__csv_file" alter column "escape_char" drop not null;

alter table "public"."datasets__csv_file" alter column "quote_char" drop default;

alter table "public"."datasets__csv_file" alter column "quote_char" drop not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_csv_file_dataset(p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_size_in_bytes integer, p_rows_to_skip integer, p_quote_char util__nullable_text, p_escape_char util__nullable_text, p_delimiter text, p_newline_delimiter text, p_comment_char util__nullable_text, p_has_header boolean, p_date_format datasets__csv_file__date_format)
 RETURNS datasets
 LANGUAGE plpgsql
AS $function$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'csv_file',
    p_columns
  );

  insert into public.datasets__csv_file (
    dataset_id,
    workspace_id,
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
$function$
;


