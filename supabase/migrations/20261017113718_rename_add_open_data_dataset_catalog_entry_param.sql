drop function if exists "public"."rpc_datasets__add_open_data_dataset"(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_entry_id uuid, p_columns public.dataset_column_input[]);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_open_data_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_listing_id uuid, p_columns public.dataset_column_input[])
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
    'open_data',
    p_columns
  );

  insert into public.datasets__open_data(
    dataset_id,
    workspace_id,
    catalog_listing_id
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_catalog_listing_id
  );

  return v_dataset;
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_datasets__add_open_data_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_listing_id uuid, p_columns dataset_column_input[]) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_open_data_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_catalog_listing_id uuid, p_columns dataset_column_input[]) to "authenticated";
