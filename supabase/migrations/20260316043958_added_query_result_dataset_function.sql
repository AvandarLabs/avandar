set
  check_function_bodies = off;

create or replace function public.rpc_datasets__add_virtual_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_raw_sql text
) returns public.datasets language plpgsql as $function$
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
    raw_sql
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_raw_sql
  );

  return v_dataset;
end;
$function$;
