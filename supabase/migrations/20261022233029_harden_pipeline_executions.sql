revoke update on table "public"."pipeline_execution_scopes" from "service_role";

alter table "public"."pipeline_execution_scopes" drop constraint "pipeline_execution_scopes_execution_id_fkey";

alter table "public"."pipeline_executions" alter column "columns_considered" set data type bigint using "columns_considered"::bigint;

alter table "public"."pipeline_executions" alter column "columns_written" set data type bigint using "columns_written"::bigint;

CREATE UNIQUE INDEX pipeline_executions__id_pipeline_name ON public.pipeline_executions USING btree (id, pipeline_name);

alter table "public"."pipeline_execution_scopes" add constraint "pipeline_execution_scopes__execution_fkey" FOREIGN KEY (execution_id, pipeline_name) REFERENCES public.pipeline_executions(id, pipeline_name) ON DELETE CASCADE not valid;

alter table "public"."pipeline_execution_scopes" validate constraint "pipeline_execution_scopes__execution_fkey";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__cancelled_only_on_reset_or_prune" CHECK (((status <> 'cancelled'::public.pipeline_executions__status) OR (command <> 'run'::public.pipeline_executions__command))) not valid;

alter table "public"."pipeline_executions" validate constraint "pipeline_executions__cancelled_only_on_reset_or_prune";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__error_only_on_failure" CHECK (((error IS NULL) OR (status = ANY (ARRAY['failed'::public.pipeline_executions__status, 'partially_failed'::public.pipeline_executions__status])))) not valid;

alter table "public"."pipeline_executions" validate constraint "pipeline_executions__error_only_on_failure";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__id_pipeline_name" UNIQUE using index "pipeline_executions__id_pipeline_name";

alter table "public"."pipeline_executions" add constraint "pipeline_executions__partially_failed_only_on_runs" CHECK (((status <> 'partially_failed'::public.pipeline_executions__status) OR (command = 'run'::public.pipeline_executions__command))) not valid;

alter table "public"."pipeline_executions" validate constraint "pipeline_executions__partially_failed_only_on_runs";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rpc_pipeline_executions__finish(p_execution_id uuid, p_outcome jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_pipeline_name text;
  v_status public.pipeline_executions__status;
  v_outcome public.pipeline_executions;
  v_scope_count integer;
  v_unknown_keys text[];
begin
  if jsonb_typeof(p_outcome) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__finish needs a JSON object';
  end if;
  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_outcome) key
  where key <> all (array[
    'status', 'error', 'finished_at', 'setup_ms', 'listings_deleted',
    'listings_kept_in_use', 'listings_detached', 'checkpoints_deleted',
    'workspace_datasets_deleted'
  ]);
  if v_unknown_keys is not null then
    raise exception 'rpc_pipeline_executions__finish got unknown keys: %', v_unknown_keys;
  end if;

  select execution.pipeline_name, execution.status, execution.scope_count
  into v_pipeline_name, v_status, v_scope_count
  from public.pipeline_executions execution
  where execution.id = p_execution_id
  for update;

  -- `PE002` and `PE001` are in class `PE`, which neither the SQL standard
  -- nor Postgres defines, and which PostgREST returns as the error's `code`
  -- without treating it as an HTTP status (it does that only for `PT`). A
  -- caller can tell these states apart from `P0001` argument errors.
  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id
      using errcode = 'PE002';
  end if;
  -- A finished execution's totals are final: a late or repeated call must
  -- not change them.
  if v_status <> 'running' then
    raise exception 'Pipeline execution % already finished', p_execution_id
      using errcode = 'PE001';
  end if;

  if v_scope_count > 0 and p_outcome ?| array[
    'listings_deleted', 'listings_kept_in_use', 'listings_detached',
    'checkpoints_deleted'
  ] then
    raise exception 'Pipeline execution % has scope rows, so its deletion totals come from them', p_execution_id;
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_pipeline_executions__record_scope(p_execution_id uuid, p_scope jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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

  -- `PE002` and `PE001` are in class `PE`, which neither the SQL standard
  -- nor Postgres defines, and which PostgREST returns as the error's `code`
  -- without treating it as an HTTP status (it does that only for `PT`). A
  -- caller can tell these states apart from `P0001` argument errors.
  if v_pipeline_name is null then
    raise exception 'Pipeline execution % does not exist', p_execution_id
      using errcode = 'PE002';
  end if;
  -- A finished execution's totals are final: a late or repeated call must
  -- not change them.
  if v_status <> 'running' then
    raise exception 'Pipeline execution % already finished', p_execution_id
      using errcode = 'PE001';
  end if;

  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_scope) key
  where key <> all (array[
    'drive_key', 'scope_key', 'status', 'error', 'window_since',
    'window_until', 'checkpoint_before', 'checkpoint_after', 'started_at',
    'finished_at', 'setup_ms', 'extract_ms', 'transform_ms', 'load_read_ms',
    'load_parquet_build_ms', 'load_parquet_upload_ms', 'load_write_ms',
    'checkpoint_write_ms', 'page_count', 'datasets_fetched',
    'listings_considered', 'listings_written', 'listings_unchanged',
    'write_batches', 'columns_considered', 'columns_written',
    'max_columns_per_listing', 'source_csv_bytes', 'parquet_bytes_written',
    'parquet_rows_written', 'parquet_uploads_skipped', 'source_bytes_reported',
    'listings_deleted', 'listings_kept_in_use', 'listings_detached',
    'checkpoints_deleted', 'pipeline_metrics'
  ]);
  if v_unknown_keys is not null then
    raise exception 'rpc_pipeline_executions__record_scope got unknown keys: %', v_unknown_keys;
  end if;
  v_scope := jsonb_populate_record(null::public.pipeline_execution_scopes, p_scope);

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
      sum(scope.columns_considered)::bigint as columns_considered,
      sum(scope.columns_written)::bigint as columns_written,
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_pipeline_executions__start(p_execution jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_input public.pipeline_executions;
  v_id uuid;
  v_unknown_keys text[];
begin
  if jsonb_typeof(p_execution) is distinct from 'object' then
    raise exception 'rpc_pipeline_executions__start needs a JSON object';
  end if;
  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_execution) key
  where key <> all (array[
    'id', 'pipeline_name', 'command', 'run_mode', 'is_dry_run', 'is_scoped',
    'is_limited', 'is_windowed', 'invoked_via', 'cli_argv', 'request_body',
    'arguments', 'actor', 'host', 'code_version', 'started_at'
  ]);
  if v_unknown_keys is not null then
    raise exception 'rpc_pipeline_executions__start got unknown keys: %', v_unknown_keys;
  end if;
  v_input := jsonb_populate_record(null::public.pipeline_executions, p_execution);

  -- A crashed or killed process leaves its execution `running` forever.
  -- `greatest` keeps `finished_at` from preceding a `started_at` the caller
  -- set later than the row's insert.
  update public.pipeline_executions execution
  set
    status = 'failed',
    error = 'Abandoned: no progress for 24 hours',
    finished_at = greatest(execution.updated_at, execution.started_at)
  where
    execution.pipeline_name = v_input.pipeline_name
    and execution.status = 'running'
    and execution.updated_at < now() - interval '24 hours';

  insert into public.pipeline_executions (
    id,
    pipeline_name,
    command,
    run_mode,
    is_dry_run,
    is_scoped,
    is_limited,
    is_windowed,
    invoked_via,
    cli_argv,
    request_body,
    arguments,
    actor,
    host,
    code_version,
    started_at
  ) values (
    coalesce(v_input.id, gen_random_uuid()),
    v_input.pipeline_name,
    v_input.command,
    v_input.run_mode,
    coalesce(v_input.is_dry_run, false),
    coalesce(v_input.is_scoped, false),
    coalesce(v_input.is_limited, false),
    coalesce(v_input.is_windowed, false),
    v_input.invoked_via,
    v_input.cli_argv,
    v_input.request_body,
    coalesce(v_input.arguments, '{}'::jsonb),
    v_input.actor,
    v_input.host,
    v_input.code_version,
    coalesce(v_input.started_at, now())
  )
  returning id into v_id;

  return v_id;
end;
$function$
;


