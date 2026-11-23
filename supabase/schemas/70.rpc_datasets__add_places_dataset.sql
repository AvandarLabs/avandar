/**
 * Add a places dataset to a workspace: a virtual dataset whose defining SQL is
 * a `VALUES` list of hand-placed sites, flagged so the map's "Add a place"
 * tool may rewrite it. The GIS app calls this when a user creates a dataset
 * such as "Exposure sites".
 *
 * @param p_columns The fixed places columns.
 * @param p_raw_sql The `VALUES` query that holds the places.
 *
 * @returns The created dataset.
 */
create or replace function public.rpc_datasets__add_places_dataset (
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
$$ language plpgsql security invoker;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_datasets__add_places_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_datasets__add_places_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  text
) to authenticated;
