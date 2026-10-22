/**
 * Records one drive and scope a pipeline execution worked on, and recomputes
 * the execution's totals from all of its scope rows, in one transaction, so
 * the totals always equal the sum of the rows. The execution's `setup_ms`
 * becomes the sum of its rows' `setup_ms`; `__finish` then adds the run's
 * own setup.
 *
 * @param p_execution_id The execution.
 * @param p_scope A JSON object with `pipeline_execution_scopes` columns,
 *   without `id`, `execution_id`, `pipeline_name`, `created_at`,
 *   `updated_at`, `duration_ms`, or `avg_columns_per_listing`, which the
 *   function or the table sets. Timings and counts default to 0,
 *   `pipeline_metrics` to `{}`.
 *
 * @throws When `p_scope` is not a JSON object, or has a key that is not an
 *   allowed column, so a typo fails instead of recording a 0. Also when the
 *   execution does not exist or already finished, or already has a row for
 *   the same drive and scope.
 */
create or replace function public.rpc_pipeline_executions__record_scope (p_execution_id uuid, p_scope jsonb) returns void as $$
declare
  v_pipeline_name text;
  v_status public.pipeline_executions__status;
  v_scope public.pipeline_execution_scopes;
  v_unknown_keys text[];
begin
  if jsonb_typeof(p_scope) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__record_scope needs a JSON object';
  end if;
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

  v_scope := jsonb_populate_record(null::public.pipeline_execution_scopes, p_scope);
  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_scope) key
  where key not in (
    select column_key
    from jsonb_object_keys(to_jsonb(v_scope)) column_key
    where column_key <> all (array[
      'id', 'execution_id', 'pipeline_name', 'created_at', 'updated_at',
      'duration_ms', 'avg_columns_per_listing'
    ])
  );
  if v_unknown_keys is not null then
    raise exception 'rpc_pipeline_executions__record_scope got unknown keys: %', v_unknown_keys;
  end if;

  begin

  insert into public.pipeline_execution_scopes (
    execution_id, pipeline_name, drive_key, scope_key, status, error,
    window_since, window_until, checkpoint_before, checkpoint_after,
    started_at, finished_at,
    setup_ms, extract_ms, transform_ms, load_read_ms, load_parquet_build_ms,
    load_parquet_upload_ms, load_write_ms, checkpoint_write_ms,
    page_count, datasets_fetched, listings_considered, listings_written,
    listings_unchanged, write_batches, columns_considered, columns_written,
    max_columns_per_listing, source_csv_bytes, parquet_bytes_written,
    parquet_rows_written, parquet_uploads_skipped, source_bytes_reported,
    listings_deleted, listings_kept_in_use, listings_detached,
    checkpoints_deleted, pipeline_metrics
  ) values (
    p_execution_id, v_pipeline_name, v_scope.drive_key, v_scope.scope_key,
    v_scope.status, v_scope.error,
    v_scope.window_since, v_scope.window_until,
    v_scope.checkpoint_before, v_scope.checkpoint_after,
    v_scope.started_at, v_scope.finished_at,
    coalesce(v_scope.setup_ms, 0), coalesce(v_scope.extract_ms, 0),
    coalesce(v_scope.transform_ms, 0), coalesce(v_scope.load_read_ms, 0),
    coalesce(v_scope.load_parquet_build_ms, 0),
    coalesce(v_scope.load_parquet_upload_ms, 0),
    coalesce(v_scope.load_write_ms, 0), coalesce(v_scope.checkpoint_write_ms, 0),
    coalesce(v_scope.page_count, 0), coalesce(v_scope.datasets_fetched, 0),
    coalesce(v_scope.listings_considered, 0),
    coalesce(v_scope.listings_written, 0),
    coalesce(v_scope.listings_unchanged, 0), coalesce(v_scope.write_batches, 0),
    coalesce(v_scope.columns_considered, 0),
    coalesce(v_scope.columns_written, 0),
    coalesce(v_scope.max_columns_per_listing, 0),
    coalesce(v_scope.source_csv_bytes, 0),
    coalesce(v_scope.parquet_bytes_written, 0),
    coalesce(v_scope.parquet_rows_written, 0),
    coalesce(v_scope.parquet_uploads_skipped, 0),
    v_scope.source_bytes_reported,
    coalesce(v_scope.listings_deleted, 0),
    coalesce(v_scope.listings_kept_in_use, 0),
    coalesce(v_scope.listings_detached, 0),
    coalesce(v_scope.checkpoints_deleted, 0),
    coalesce(v_scope.pipeline_metrics, '{}'::jsonb)
  );
  exception
    when unique_violation then
      raise exception 'Pipeline execution % already has drive % scope %',
        p_execution_id, v_scope.drive_key, v_scope.scope_key;
  end;

  update public.pipeline_executions execution
  set
    drive_count = totals.drive_count,
    scope_count = totals.scope_count,
    setup_ms = totals.setup_ms,
    extract_ms = totals.extract_ms,
    transform_ms = totals.transform_ms,
    load_read_ms = totals.load_read_ms,
    load_parquet_build_ms = totals.load_parquet_build_ms,
    load_parquet_upload_ms = totals.load_parquet_upload_ms,
    load_write_ms = totals.load_write_ms,
    checkpoint_write_ms = totals.checkpoint_write_ms,
    page_count = totals.page_count,
    datasets_fetched = totals.datasets_fetched,
    listings_considered = totals.listings_considered,
    listings_written = totals.listings_written,
    listings_unchanged = totals.listings_unchanged,
    write_batches = totals.write_batches,
    columns_considered = totals.columns_considered,
    columns_written = totals.columns_written,
    max_columns_per_listing = totals.max_columns_per_listing,
    source_csv_bytes = totals.source_csv_bytes,
    parquet_bytes_written = totals.parquet_bytes_written,
    parquet_rows_written = totals.parquet_rows_written,
    parquet_uploads_skipped = totals.parquet_uploads_skipped,
    source_bytes_reported = totals.source_bytes_reported,
    listings_deleted = totals.listings_deleted,
    listings_kept_in_use = totals.listings_kept_in_use,
    listings_detached = totals.listings_detached,
    checkpoints_deleted = totals.checkpoints_deleted
  from (
    select
      count(distinct scope.drive_key)::integer as drive_count,
      count(*)::integer as scope_count,
      sum(scope.setup_ms)::bigint as setup_ms,
      sum(scope.extract_ms)::bigint as extract_ms,
      sum(scope.transform_ms)::bigint as transform_ms,
      sum(scope.load_read_ms)::bigint as load_read_ms,
      sum(scope.load_parquet_build_ms)::bigint as load_parquet_build_ms,
      sum(scope.load_parquet_upload_ms)::bigint as load_parquet_upload_ms,
      sum(scope.load_write_ms)::bigint as load_write_ms,
      sum(scope.checkpoint_write_ms)::bigint as checkpoint_write_ms,
      sum(scope.page_count)::integer as page_count,
      sum(scope.datasets_fetched)::integer as datasets_fetched,
      sum(scope.listings_considered)::integer as listings_considered,
      sum(scope.listings_written)::integer as listings_written,
      sum(scope.listings_unchanged)::integer as listings_unchanged,
      sum(scope.write_batches)::integer as write_batches,
      sum(scope.columns_considered)::integer as columns_considered,
      sum(scope.columns_written)::integer as columns_written,
      max(scope.max_columns_per_listing)::integer as max_columns_per_listing,
      sum(scope.source_csv_bytes)::bigint as source_csv_bytes,
      sum(scope.parquet_bytes_written)::bigint as parquet_bytes_written,
      sum(scope.parquet_rows_written)::bigint as parquet_rows_written,
      sum(scope.parquet_uploads_skipped)::integer as parquet_uploads_skipped,
      sum(scope.source_bytes_reported)::bigint as source_bytes_reported,
      sum(scope.listings_deleted)::integer as listings_deleted,
      sum(scope.listings_kept_in_use)::integer as listings_kept_in_use,
      sum(scope.listings_detached)::integer as listings_detached,
      sum(scope.checkpoints_deleted)::integer as checkpoints_deleted
    from public.pipeline_execution_scopes scope
    where scope.execution_id = p_execution_id
  ) totals
  where execution.id = p_execution_id;
end;
$$ language plpgsql volatile security invoker
set
  search_path = '';

-- `service_role` only: pipelines and the `ava` CLI record executions with
-- the service role key.
revoke
execute on function public.rpc_pipeline_executions__record_scope (uuid, jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_pipeline_executions__record_scope (uuid, jsonb) to service_role;
