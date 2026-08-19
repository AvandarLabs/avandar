/**
 * Add a PDF file dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__pdf_file.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_is_in_cloud_storage: Whether the raw file is stored in cloud storage
 * @param p_size_in_bytes: The size of the source PDF in bytes
 * @param p_has_original_file: Whether the original PDF was retained
 * @param p_regions: The regions extracted from the PDF, each with its own
 *   shape, geometry and shape-specific options
 * @param p_output_mode: How several regions combine into one dataset
 * @param p_llm_model: Which model produced any model-extracted rows, or null
 *   when the rows came from rules alone
 * @param p_page_range_start: First page detection was limited to, inclusive and zero-based
 * @param p_page_range_end: Last page detection was limited to, inclusive and zero-based
 * @param p_fingerprint: Snapshot of what was extracted at import time
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_pdf_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes bigint,
  p_has_original_file boolean,
  p_regions jsonb,
  p_page_range_start integer,
  p_page_range_end integer,
  p_fingerprint jsonb,
  -- Trailing because Postgres requires every parameter after a defaulted one
  -- to be defaulted too.
  p_output_mode public.datasets__pdf_output_mode default 'natural',
  p_llm_model text default null
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'pdf_file',
    p_columns
  );

  insert into public.datasets__pdf_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    has_original_file,
    regions,
    output_mode,
    llm_model,
    page_range_start,
    page_range_end,
    fingerprint
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_has_original_file,
    p_regions,
    p_output_mode,
    p_llm_model,
    p_page_range_start,
    p_page_range_end,
    p_fingerprint
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;

-- Function privileges.
--
-- REQUIRED, not optional. Postgres grants EXECUTE on every new function to
-- PUBLIC, and no `alter default privileges` declaration can suppress that, so
-- a function is the one object class that cannot be denied by default. Without
-- this block the RPC is callable by `anon`, which is how it was born: its live
-- ACL read `=X/postgres anon=X/postgres`.
--
-- Only `authenticated` invokes it. The single caller is the browser client in
-- `src/clients/datasets/DatasetClient/createDatasetMutations.ts`; nothing
-- server-side calls it, so `service_role` is deliberately not granted.
revoke all on function public.rpc_datasets__add_pdf_file_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  boolean,
  bigint,
  boolean,
  jsonb,
  integer,
  integer,
  jsonb,
  public.datasets__pdf_output_mode,
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_datasets__add_pdf_file_dataset (
  uuid,
  uuid,
  text,
  text,
  public.dataset_column_input[],
  boolean,
  bigint,
  boolean,
  jsonb,
  integer,
  integer,
  jsonb,
  public.datasets__pdf_output_mode,
  text
) to authenticated;
