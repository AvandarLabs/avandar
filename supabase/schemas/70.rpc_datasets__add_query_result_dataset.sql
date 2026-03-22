/**
 * Add a Query Result dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__virtual.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_raw_sql: The raw SQL query that generates the dataset
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_virtual_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_raw_sql text
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
    raw_sql
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_raw_sql
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
