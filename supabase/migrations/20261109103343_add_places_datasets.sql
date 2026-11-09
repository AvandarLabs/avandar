alter table "public"."datasets__virtual" add column "is_places" boolean not null default false;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_places_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns public.dataset_column_input[], p_raw_sql text)
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
    'virtual',
    p_columns
  );

  insert into public.datasets__virtual(
    dataset_id,
    workspace_id,
    raw_sql,
    is_places
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_raw_sql,
    true
  );

  return v_dataset;
end;
$function$
;


-- Privileges that `supabase db diff` cannot see: default, schema, column,
-- and view grants. Appended by `pnpm db:new-migration` from what
-- `supabase/schemas/` declares. Do not hand-edit; re-run the command.
revoke all privileges on function public.rpc_datasets__add_places_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_raw_sql text) from public, anon, authenticated, service_role;
grant EXECUTE on function public.rpc_datasets__add_places_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_columns dataset_column_input[], p_raw_sql text) to "authenticated";
