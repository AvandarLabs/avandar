\set ON_ERROR_STOP on

/**
 * The `case_types` and `case_records` apps exist in `app_type`, and a new
 * workspace's built-in role groups are seeded with both.
 */
begin;

set search_path to extensions, public;

select plan(2);

select ok(
  'case_types' = any (
    select enumlabel::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_type'
  ),
  'app_type includes case_types'
);

select ok(
  'case_records' = any (
    select enumlabel::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_type'
  ),
  'app_type includes case_records'
);

select * from finish();

rollback;
