/**
 * Add a Postgres table/view dataset to a workspace.
 *
 * @param p_dataset_id The id of the dataset to add.
 * @param p_workspace_id The workspace id to add the dataset to.
 * @param p_dataset_name The name of the dataset.
 * @param p_dataset_description The description of the dataset.
 * @param p_columns The columns of the dataset.
 * @param p_connection_id The saved `db_connections` row this dataset reads
 *   through.
 * @param p_schema_name The Postgres schema the table/view lives in.
 * @param p_table_name The Postgres table or view name.
 * @param p_relation_kind Whether the relation is a table or a view.
 *
 * @returns The created dataset.
 */
create or replace function public.rpc_datasets__add_postgres_table_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_connection_id uuid,
  p_schema_name text,
  p_table_name text,
  p_relation_kind public.datasets__postgres_table_relation_kind
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'postgres_table',
    p_columns
  );

  insert into public.datasets__postgres_table (
    dataset_id,
    workspace_id,
    connection_id,
    schema_name,
    table_name,
    relation_kind
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_connection_id,
    p_schema_name,
    p_table_name,
    p_relation_kind
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_datasets__add_postgres_table_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  uuid,
  text,
  text,
  public.datasets__postgres_table_relation_kind
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_datasets__add_postgres_table_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  uuid,
  text,
  text,
  public.datasets__postgres_table_relation_kind
) to authenticated;
