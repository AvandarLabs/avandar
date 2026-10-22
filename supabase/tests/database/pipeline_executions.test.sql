\set ON_ERROR_STOP on

-- Fixtures: none. Each test inserts what it reads, and the transaction is
-- rolled back. Pipeline names are `pgtap-fixture`-prefixed.

begin;

set search_path to extensions, public;

select plan(41);

-- ---------------------------------------------------------------------------
-- pipeline_executions
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via)
    values ('pgtap-fixture', 'run', 'cli_local')$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__run_mode_only_on_runs"',
  'a run needs a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, run_mode, invoked_via)
    values ('pgtap-fixture', 'reset', 'full', 'cli_local')$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__run_mode_only_on_runs"',
  'only a run has a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via, status)
    values ('pgtap-fixture', 'reset', 'cli_local', 'succeeded')$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__finished_unless_running"',
  'a finished execution has a finish time'
);

select throws_ok(
  $$insert into public.pipeline_executions
      (pipeline_name, command, invoked_via, status, started_at, finished_at)
    values ('pgtap-fixture', 'reset', 'cli_local', 'succeeded',
            '2026-10-22T10:00:01Z', '2026-10-22T10:00:00Z')$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__finishes_after_start"',
  'an execution cannot finish before it starts'
);

select throws_ok(
  $$insert into public.pipeline_executions
      (pipeline_name, command, invoked_via, status, finished_at)
    values ('pgtap-fixture', 'reset', 'cli_local', 'partially_failed', now())$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__partially_failed_only_on_runs"',
  'only a run can partially fail'
);

select throws_ok(
  $$insert into public.pipeline_executions
      (pipeline_name, command, run_mode, invoked_via, status, finished_at)
    values ('pgtap-fixture', 'run', 'full', 'cli_local', 'cancelled', now())$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__cancelled_only_on_reset_or_prune"',
  'a run cannot be cancelled'
);

select throws_ok(
  $$insert into public.pipeline_executions
      (pipeline_name, command, invoked_via, status, finished_at, error)
    values ('pgtap-fixture', 'reset', 'cli_local', 'succeeded', now(), 'oops')$$,
  '23514',
  'new row for relation "pipeline_executions" violates check constraint "pipeline_executions__error_only_on_failure"',
  'only a failed or partially failed execution has an error'
);

insert into public.pipeline_executions
  (id, pipeline_name, command, invoked_via, status, started_at, finished_at)
values
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture', 'reset',
   'cli_local', 'succeeded', '2026-10-22T10:00:00Z', '2026-10-22T10:00:01.5Z');

select is(
  (
    select duration_ms
    from public.pipeline_executions
    where id = 'ea100001-0000-4000-8000-000000000001'::uuid
  ),
  1500::bigint,
  'duration_ms is the wall-clock milliseconds between start and finish'
);

-- ---------------------------------------------------------------------------
-- pipeline_execution_scopes
-- ---------------------------------------------------------------------------

insert into public.pipeline_execution_scopes
  (execution_id, pipeline_name, drive_key, scope_key, status, started_at,
   finished_at, listings_considered, columns_considered)
values
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
   'https://pgtap-fixture.invalid', 'all', 'succeeded',
   '2026-10-22T10:00:00Z', '2026-10-22T10:00:01Z', 4, 10),
  ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
   'https://pgtap-fixture.invalid', 'empty', 'skipped',
   '2026-10-22T10:00:01Z', '2026-10-22T10:00:01Z', 0, 0);

select results_eq(
  $$select scope_key, avg_columns_per_listing
    from public.pipeline_execution_scopes
    where execution_id = 'ea100001-0000-4000-8000-000000000001'::uuid
    order by scope_key$$,
  $$values ('all', 2.5::numeric), ('empty', null::numeric)$$,
  'avg_columns_per_listing divides columns by listings, and is null with no listings'
);

select throws_ok(
  $$insert into public.pipeline_execution_scopes
      (execution_id, pipeline_name, drive_key, scope_key, status, started_at, finished_at)
    values ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
            'https://pgtap-fixture.invalid', 'all', 'succeeded',
            '2026-10-22T10:00:00Z', '2026-10-22T10:00:01Z')$$,
  '23505',
  'duplicate key value violates unique constraint "pipeline_execution_scopes__one_per_scope"',
  'an execution has one row per drive and scope'
);

select throws_ok(
  $$insert into public.pipeline_execution_scopes
      (execution_id, pipeline_name, drive_key, scope_key, status, started_at, finished_at)
    values ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture',
            'https://pgtap-fixture.invalid', 'backwards', 'succeeded',
            '2026-10-22T10:00:01Z', '2026-10-22T10:00:00Z')$$,
  '23514',
  'new row for relation "pipeline_execution_scopes" violates check constraint "pipeline_execution_scopes__finishes_after_start"',
  'a scope cannot finish before it starts'
);

select throws_ok(
  $$insert into public.pipeline_execution_scopes
      (execution_id, pipeline_name, drive_key, scope_key, status, started_at, finished_at)
    values ('ea100001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture-other',
            'https://pgtap-fixture.invalid', 'mismatch', 'succeeded',
            '2026-10-22T10:00:00Z', '2026-10-22T10:00:01Z')$$,
  '23503',
  'insert or update on table "pipeline_execution_scopes" violates foreign key constraint "pipeline_execution_scopes__execution_fkey"',
  'a scope row''s pipeline name matches its execution''s'
);

delete from public.pipeline_executions
where id = 'ea100001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.pipeline_execution_scopes
    where execution_id = 'ea100001-0000-4000-8000-000000000001'::uuid
  ),
  0::bigint,
  'deleting an execution deletes its scope rows'
);

-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__start
-- ---------------------------------------------------------------------------

select is(
  public.rpc_pipeline_executions__start(jsonb_build_object(
    'id', 'ea200001-0000-4000-8000-000000000001',
    'pipeline_name', 'pgtap-fixture-run',
    'command', 'run',
    'run_mode', 'incremental',
    'is_scoped', true,
    'invoked_via', 'cli_server',
    'cli_argv', jsonb_build_array('pipeline', 'run', 'pgtap-fixture-run', '--incremental'),
    'request_body', jsonb_build_object('incremental', true),
    'arguments', jsonb_build_object('mode', 'incremental'),
    'actor', 'pablo@laptop',
    'host', 'fly-machine',
    'code_version', 'abc123',
    'started_at', '2026-10-22T10:00:00Z'
  )),
  'ea200001-0000-4000-8000-000000000001'::uuid,
  'start returns the execution id'
);

select results_eq(
  $$select status::text, command::text, run_mode::text, is_scoped, cli_argv,
      request_body, actor, code_version
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('running', 'run', 'incremental', true,
      array['pipeline', 'run', 'pgtap-fixture-run', '--incremental'],
      '{"incremental": true}'::jsonb, 'pablo@laptop', 'abc123')$$,
  'start records a running execution with its invocation'
);

-- Abandoned executions: a running row with no progress for over 24 hours is
-- failed by the next start of the same pipeline.
insert into public.pipeline_executions
  (id, pipeline_name, command, invoked_via, started_at, updated_at)
values
  ('ea400001-0000-4000-8000-000000000001'::uuid, 'pgtap-fixture-abandon',
   'reset', 'cli_local', now() - interval '30 hours', now() - interval '25 hours'),
  ('ea400002-0000-4000-8000-000000000002'::uuid, 'pgtap-fixture-abandon',
   'reset', 'cli_local', now() - interval '30 hours', now() - interval '1 hour'),
  ('ea400003-0000-4000-8000-000000000003'::uuid, 'pgtap-fixture-elsewhere',
   'reset', 'cli_local', now() - interval '30 hours', now() - interval '25 hours');

select public.rpc_pipeline_executions__start(jsonb_build_object(
  'pipeline_name', 'pgtap-fixture-abandon', 'command', 'reset',
  'invoked_via', 'cli_local'
));

select results_eq(
  $$select status::text, error, finished_at
    from public.pipeline_executions
    where id = 'ea400001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('failed', 'Abandoned: no progress for 24 hours',
      now() - interval '25 hours')$$,
  'start fails the pipeline''s execution with no progress for 24 hours, finished at its last progress'
);

select results_eq(
  $$select status::text, error
    from public.pipeline_executions
    where id = 'ea400002-0000-4000-8000-000000000002'::uuid$$,
  $$values ('running', null::text)$$,
  'start leaves a running execution with recent progress alone'
);

select results_eq(
  $$select status::text, error
    from public.pipeline_executions
    where id = 'ea400003-0000-4000-8000-000000000003'::uuid$$,
  $$values ('running', null::text)$$,
  'start leaves another pipeline''s abandoned execution alone'
);

-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__record_scope
-- ---------------------------------------------------------------------------

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'all',
    'status', 'succeeded',
    'started_at', '2026-10-22T10:00:00Z', 'finished_at', '2026-10-22T10:00:02Z',
    'setup_ms', 5, 'extract_ms', 100, 'load_write_ms', 30,
    'page_count', 2, 'datasets_fetched', 10, 'listings_considered', 12,
    'listings_written', 8, 'columns_considered', 60, 'columns_written', 40,
    'max_columns_per_listing', 9, 'source_bytes_reported', 1000,
    'pipeline_metrics', jsonb_build_object('hdx.parquet_footer_reads', 1)
  )
);

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'category:health',
    'status', 'failed', 'error', 'source answered 500',
    'started_at', '2026-10-22T10:00:02Z', 'finished_at', '2026-10-22T10:00:03Z',
    'setup_ms', 3, 'extract_ms', 50,
    'page_count', 1, 'datasets_fetched', 5, 'listings_considered', 5,
    'listings_written', 5, 'columns_considered', 20, 'columns_written', 20,
    'max_columns_per_listing', 14
  )
);

select public.rpc_pipeline_executions__record_scope(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'drive_key', 'https://b.pgtap-fixture.invalid', 'scope_key', 'all',
    'status', 'skipped',
    'started_at', '2026-10-22T10:00:03Z', 'finished_at', '2026-10-22T10:00:03Z'
  )
);

select results_eq(
  $$select drive_count, scope_count, setup_ms, extract_ms, load_write_ms,
      page_count, datasets_fetched, listings_considered, listings_written,
      columns_considered, columns_written, max_columns_per_listing,
      source_bytes_reported
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values (2, 3, 8::bigint, 150::bigint, 30::bigint, 3, 15, 17, 13, 80::bigint,
      60::bigint, 14, 1000::bigint)$$,
  'record_scope keeps the totals equal to the sum of the scope rows'
);

select results_eq(
  $$select pipeline_name, status::text, error
    from public.pipeline_execution_scopes
    where execution_id = 'ea200001-0000-4000-8000-000000000001'::uuid
      and scope_key = 'category:health'$$,
  $$values ('pgtap-fixture-run', 'failed', 'source answered 500')$$,
  'record_scope copies the pipeline name and keeps the outcome'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea2000ff-0000-4000-8000-0000000000ff'::uuid,
      jsonb_build_object('drive_key', 'x', 'scope_key', 'all', 'status', 'succeeded',
        'started_at', now(), 'finished_at', now()))$$,
  'PE002',
  'Pipeline execution ea2000ff-0000-4000-8000-0000000000ff does not exist',
  'record_scope refuses an unknown execution'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea2000ff-0000-4000-8000-0000000000ff'::uuid,
      jsonb_build_object('status', 'failed'))$$,
  'PE002',
  'Pipeline execution ea2000ff-0000-4000-8000-0000000000ff does not exist',
  'finish refuses an unknown execution'
);

-- Column totals across a whole catalog can pass the integer range.
select public.rpc_pipeline_executions__start(jsonb_build_object(
  'id', 'ea200005-0000-4000-8000-000000000005',
  'pipeline_name', 'pgtap-fixture-wide', 'command', 'run',
  'run_mode', 'full', 'invoked_via', 'cli_local'
));

select public.rpc_pipeline_executions__record_scope(
  'ea200005-0000-4000-8000-000000000005'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'scope:' || scope_number,
    'status', 'succeeded', 'started_at', now(), 'finished_at', now(),
    'columns_considered', 2000000000, 'columns_written', 2000000000
  )
)
from generate_series(1, 2) scope_number;

select results_eq(
  $$select columns_considered, columns_written
    from public.pipeline_executions
    where id = 'ea200005-0000-4000-8000-000000000005'::uuid$$,
  $$values (4000000000::bigint, 4000000000::bigint)$$,
  'record_scope sums column counts past the integer range'
);

-- ---------------------------------------------------------------------------
-- rpc_pipeline_executions__finish
-- ---------------------------------------------------------------------------

-- The pipeline's catalog: two prebuilt listings (one with two columns) and
-- one API listing with unverified column types.
insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind,
   parquet_file_name, pipeline_name, pipeline_run_id,
   date_column_type_last_verified)
values
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'p1', 'Fixture Org',
   'pipeline_parquet', 'pgtap-fixture-1.parquet', 'pgtap-fixture-run', 'r',
   now()),
  ('ea300002-0000-4000-8000-000000000002'::uuid, 'p2', 'Fixture Org',
   'pipeline_parquet', 'pgtap-fixture-2.parquet', 'pgtap-fixture-run', 'r',
   now());

insert into public.data_catalog_listings
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format,
   pipeline_name)
values
  ('ea300003-0000-4000-8000-000000000003'::uuid, 'a1', 'Fixture Org',
   'api_resource', 'socrata', 'https://a.pgtap-fixture.invalid',
   'pgtap-fixture-a1', 'pgtap-fixture-a1', 'CSV', 'pgtap-fixture-run');

insert into public.data_catalog_listings__relation_columns
  (catalog_listing_id, column_name, display_order, original_data_type,
   cast_data_type)
values
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'x', 0, 'BIGINT', 'BIGINT'),
  ('ea300001-0000-4000-8000-000000000001'::uuid, 'y', 1, 'VARCHAR', 'VARCHAR');

select public.rpc_pipeline_executions__finish(
  'ea200001-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'status', 'partially_failed', 'error', 'source answered 500',
    'finished_at', '2026-10-22T10:00:04Z', 'setup_ms', 20
  )
);

select results_eq(
  $$select status::text, error, duration_ms, setup_ms, catalog_listings,
      catalog_prebuilt_listings, catalog_api_listings,
      catalog_verified_listings, catalog_unverified_listings, catalog_columns
    from public.pipeline_executions
    where id = 'ea200001-0000-4000-8000-000000000001'::uuid$$,
  $$values ('partially_failed', 'source answered 500', 4000::bigint,
      28::bigint, 3, 2, 1, 2, 1, 2)$$,
  'finish closes the execution, adds the run''s own setup, and counts the catalog after'
);

select public.rpc_pipeline_executions__start(jsonb_build_object(
  'id', 'ea200002-0000-4000-8000-000000000002',
  'pipeline_name', 'pgtap-fixture-run', 'command', 'reset',
  'invoked_via', 'cli_local'
));

select public.rpc_pipeline_executions__finish(
  'ea200002-0000-4000-8000-000000000002'::uuid,
  jsonb_build_object(
    'status', 'succeeded', 'listings_deleted', 7, 'checkpoints_deleted', 2,
    'workspace_datasets_deleted', 1, 'listings_kept_in_use', 3
  )
);

select results_eq(
  $$select listings_deleted, checkpoints_deleted, workspace_datasets_deleted,
      listings_kept_in_use, finished_at is not null
    from public.pipeline_executions
    where id = 'ea200002-0000-4000-8000-000000000002'::uuid$$,
  $$values (7, 2, 1, 3, true)$$,
  'finish writes a reset''s deletion totals'
);

select public.rpc_pipeline_executions__start(jsonb_build_object(
  'id', 'ea200003-0000-4000-8000-000000000003',
  'pipeline_name', 'pgtap-fixture-run', 'command', 'reset',
  'invoked_via', 'cli_local'
));

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200003-0000-4000-8000-000000000003'::uuid,
      jsonb_build_object('status', 'running'))$$,
  'P0001',
  'rpc_pipeline_executions__finish needs a final status',
  'finish refuses to leave an execution running'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea200001-0000-4000-8000-000000000001'::uuid,
      jsonb_build_object('drive_key', 'late', 'scope_key', 'all', 'status', 'succeeded',
        'started_at', now(), 'finished_at', now()))$$,
  'PE001',
  'Pipeline execution ea200001-0000-4000-8000-000000000001 already finished',
  'record_scope refuses a scope for a finished execution'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200001-0000-4000-8000-000000000001'::uuid,
      jsonb_build_object('status', 'failed', 'finished_at', now()))$$,
  'PE001',
  'Pipeline execution ea200001-0000-4000-8000-000000000001 already finished',
  'finish refuses an execution that already finished'
);

-- ---------------------------------------------------------------------------
-- Argument validation
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select public.rpc_pipeline_executions__start(jsonb_build_object(
      'pipeline_name', 'pgtap-fixture-run', 'command', 'reset',
      'invoked_via', 'cli_local', 'pipeline_nmae', 'typo'))$$,
  'P0001',
  'rpc_pipeline_executions__start got unknown keys: {pipeline_nmae}',
  'start refuses an unknown key'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea200003-0000-4000-8000-000000000003'::uuid,
      jsonb_build_object('drive_key', 'x', 'scope_key', 'all', 'status', 'succeeded',
        'started_at', now(), 'finished_at', now(), 'extract_msec', 5, 'id', gen_random_uuid()))$$,
  'P0001',
  'rpc_pipeline_executions__record_scope got unknown keys: {extract_msec,id}',
  'record_scope refuses a typo and a key the function sets itself'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200003-0000-4000-8000-000000000003'::uuid,
      jsonb_build_object('status', 'failed', 'catalog_columns', 5))$$,
  'P0001',
  'rpc_pipeline_executions__finish got unknown keys: {catalog_columns}',
  'finish refuses a key outside the outcome'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea200003-0000-4000-8000-000000000003'::uuid, '[]'::jsonb)$$,
  'P0001',
  'rpc_pipeline_executions__record_scope needs a JSON object',
  'record_scope refuses a non-object'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200003-0000-4000-8000-000000000003'::uuid, null)$$,
  'P0001',
  'rpc_pipeline_executions__finish needs a JSON object',
  'finish refuses a null outcome'
);

-- A pipeline with scope rows takes its deletion totals from them.
select public.rpc_pipeline_executions__start(jsonb_build_object(
  'id', 'ea200004-0000-4000-8000-000000000004',
  'pipeline_name', 'pgtap-fixture-run', 'command', 'prune_retired_scopes',
  'invoked_via', 'cli_local'
));

select public.rpc_pipeline_executions__record_scope(
  'ea200004-0000-4000-8000-000000000004'::uuid,
  jsonb_build_object(
    'drive_key', 'https://a.pgtap-fixture.invalid', 'scope_key', 'category:old',
    'status', 'succeeded', 'listings_deleted', 4, 'checkpoints_deleted', 1,
    'started_at', '2026-10-22T11:00:00Z', 'finished_at', '2026-10-22T11:00:01Z'
  )
);

select throws_ok(
  $$select public.rpc_pipeline_executions__record_scope(
      'ea200004-0000-4000-8000-000000000004'::uuid,
      jsonb_build_object('drive_key', 'https://a.pgtap-fixture.invalid',
        'scope_key', 'category:old', 'status', 'failed',
        'started_at', now(), 'finished_at', now()))$$,
  'P0001',
  'Pipeline execution ea200004-0000-4000-8000-000000000004 already has drive https://a.pgtap-fixture.invalid scope category:old',
  'record_scope refuses a second row for the same drive and scope'
);

select throws_ok(
  $$select public.rpc_pipeline_executions__finish(
      'ea200004-0000-4000-8000-000000000004'::uuid,
      jsonb_build_object('status', 'succeeded', 'listings_deleted', 9))$$,
  'P0001',
  'Pipeline execution ea200004-0000-4000-8000-000000000004 has scope rows, so its deletion totals come from them',
  'finish refuses deletion totals for an execution with scope rows'
);

select public.rpc_pipeline_executions__finish(
  'ea200004-0000-4000-8000-000000000004'::uuid,
  jsonb_build_object('status', 'succeeded', 'workspace_datasets_deleted', 2)
);

select results_eq(
  $$select listings_deleted, checkpoints_deleted, workspace_datasets_deleted
    from public.pipeline_executions
    where id = 'ea200004-0000-4000-8000-000000000004'::uuid$$,
  $$values (4, 1, 2)$$,
  'finish keeps the scope-derived deletion totals and takes workspace datasets'
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege('authenticated', 'public.rpc_pipeline_executions__start(jsonb)', 'execute'),
  'a signed-in user cannot start an execution'
);

select ok(
  has_function_privilege('service_role', 'public.rpc_pipeline_executions__finish(uuid, jsonb)', 'execute'),
  'the service role can finish an execution'
);

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_executions', 'select'),
  'a signed-in user cannot read pipeline executions'
);

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_execution_scopes', 'select'),
  'a signed-in user cannot read pipeline execution scopes'
);

select ok(
  not has_table_privilege('service_role', 'public.pipeline_execution_scopes', 'update'),
  'scope rows are insert-only, even for the service role'
);

select * from finish();

rollback;
