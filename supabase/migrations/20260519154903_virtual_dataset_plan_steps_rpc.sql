-- Phase 3 — extend rpc_datasets__add_virtual_dataset with an optional
-- p_plan_steps argument so saving a multi-step analysis persists the
-- plan onto the new virtual dataset row. Default NULL keeps existing
-- callers (one-shot SQL saves) working without changes.
create or replace function public.rpc_datasets__add_virtual_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_raw_sql text,
  p_plan_steps jsonb default null
) returns public.datasets as $$
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
    plan_steps
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_raw_sql,
    p_plan_steps
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
