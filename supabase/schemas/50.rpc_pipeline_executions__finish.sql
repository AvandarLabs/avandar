/**
 * Records that a pipeline command finished: sets its status, error, and
 * finish time, adds the run's own setup time to `setup_ms`, writes deletion
 * totals a reset passes (a prune's come from its scope rows and are kept
 * when the outcome omits them), and counts the pipeline's catalog as it now
 * stands.
 *
 * @param p_execution_id The execution.
 * @param p_outcome A JSON object with `status` (not `running`), and
 *   optionally `error`, `finished_at` (defaults to now), `setup_ms`,
 *   `listings_deleted`, `listings_kept_in_use`, `listings_detached`,
 *   `checkpoints_deleted`, and `workspace_datasets_deleted`.
 *
 * @throws When the execution does not exist, or the status is missing or
 *   `running`.
 */
create or replace function public.rpc_pipeline_executions__finish (p_execution_id uuid, p_outcome jsonb) returns void as $$
declare
  v_pipeline_name text;
  v_status public.pipeline_executions__status;
  v_outcome public.pipeline_executions;
begin
  select execution.pipeline_name, execution.status
  into v_pipeline_name, v_status
  from public.pipeline_executions execution
  where execution.id = p_execution_id
  for update;

  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id;
  end if;
  -- A finished execution's totals are final: a late or repeated call must
  -- not change them.
  if v_status <> 'running' then
    raise exception 'Pipeline execution % already finished', p_execution_id;
  end if;

  v_outcome := jsonb_populate_record(null::public.pipeline_executions, p_outcome);
  if v_outcome.status is null or v_outcome.status = 'running' then
    raise exception 'rpc_pipeline_executions__finish needs a final status';
  end if;

  update public.pipeline_executions execution
  set
    status = v_outcome.status,
    error = v_outcome.error,
    finished_at = coalesce(v_outcome.finished_at, now()),
    setup_ms = execution.setup_ms + coalesce(v_outcome.setup_ms, 0),
    listings_deleted = coalesce(v_outcome.listings_deleted, execution.listings_deleted),
    listings_kept_in_use = coalesce(v_outcome.listings_kept_in_use, execution.listings_kept_in_use),
    listings_detached = coalesce(v_outcome.listings_detached, execution.listings_detached),
    checkpoints_deleted = coalesce(v_outcome.checkpoints_deleted, execution.checkpoints_deleted),
    workspace_datasets_deleted = coalesce(
      v_outcome.workspace_datasets_deleted,
      execution.workspace_datasets_deleted
    ),
    catalog_listings = catalog.listings,
    catalog_prebuilt_listings = catalog.prebuilt_listings,
    catalog_api_listings = catalog.api_listings,
    catalog_verified_listings = catalog.verified_listings,
    catalog_unverified_listings = catalog.unverified_listings,
    catalog_columns = catalog_columns.columns
  from
    (
      select
        count(*)::integer as listings,
        (count(*) filter (where listing.access_kind = 'pipeline_parquet'))::integer as prebuilt_listings,
        (count(*) filter (where listing.access_kind = 'api_resource'))::integer as api_listings,
        (count(*) filter (where listing.date_column_type_last_verified is not null))::integer as verified_listings,
        (count(*) filter (where listing.date_column_type_last_verified is null))::integer as unverified_listings
      from public.data_catalog_listings listing
      where listing.pipeline_name = v_pipeline_name
    ) catalog,
    (
      select count(*)::integer as columns
      from public.data_catalog_listings__relation_columns relation_column
      join public.data_catalog_listings listing
        on listing.id = relation_column.catalog_listing_id
      where listing.pipeline_name = v_pipeline_name
    ) catalog_columns
  where execution.id = p_execution_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__finish (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__finish (uuid, jsonb) to service_role;
