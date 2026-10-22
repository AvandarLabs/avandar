\set ON_ERROR_STOP on

-- Fixtures: none. Each test inserts what it reads, and the transaction is
-- rolled back. Pipeline names are `pgtap-fixture`-prefixed.

begin;

set search_path to extensions, public;

select plan(7);

-- ---------------------------------------------------------------------------
-- pipeline_executions
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via)
    values ('pgtap-fixture', 'run', 'cli_local')$$,
  '23514',
  null,
  'a run needs a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, run_mode, invoked_via)
    values ('pgtap-fixture', 'reset', 'full', 'cli_local')$$,
  '23514',
  null,
  'only a run has a run mode'
);

select throws_ok(
  $$insert into public.pipeline_executions (pipeline_name, command, invoked_via, status)
    values ('pgtap-fixture', 'reset', 'cli_local', 'succeeded')$$,
  '23514',
  null,
  'a finished execution has a finish time'
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

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_executions', 'select'),
  'a signed-in user cannot read pipeline executions'
);

select ok(
  not has_table_privilege('authenticated', 'public.pipeline_execution_scopes', 'select'),
  'a signed-in user cannot read pipeline execution scopes'
);

select * from finish();

rollback;
