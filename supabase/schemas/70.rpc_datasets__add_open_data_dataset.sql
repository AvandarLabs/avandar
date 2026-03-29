/**
 * Add an open data dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 *  datasets__open_data.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_catalog_entry_id: The id of the catalog entry that the dataset belongs to
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_open_data_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_catalog_entry_id uuid,
  p_columns public.dataset_column_input[]
) returns public.datasets as $$
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
    catalog_entry_id
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_catalog_entry_id
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
