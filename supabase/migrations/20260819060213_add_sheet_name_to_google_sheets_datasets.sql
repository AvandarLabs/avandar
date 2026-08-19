drop function if exists "public"."rpc_datasets__add_google_sheets_dataset"(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer);

alter table "public"."datasets__google_sheets" add column "sheet_name" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_google_sheets_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_google_account_id text, p_google_document_id text, p_rows_to_skip integer DEFAULT 0, p_sheet_name public.util__nullable_text DEFAULT NULL::public.util__nullable_text)
 RETURNS public.datasets
 LANGUAGE plpgsql
AS $function$
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
    rows_to_skip,
    sheet_name
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_google_account_id,
    p_google_document_id,
    p_rows_to_skip,
    p_sheet_name.value
  );

  return v_dataset;
end;
$function$
;

