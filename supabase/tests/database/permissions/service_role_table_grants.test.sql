\set ON_ERROR_STOP on

/**
 * Every public table must allow `service_role` DML. E2E admin clients and
 * edge functions use the service role key. Table files under
 * `supabase/schemas/` declare this grant next to `create table`, but
 * `schema_paths` is empty so only migrations apply in CI. A missing grant
 * fails with "permission denied for table <name>" (see GIS map seeding).
 */
begin;

set search_path to extensions, public;

select plan(2);

select ok(
  has_table_privilege('service_role', 'public.maps', 'INSERT'),
  'service_role can INSERT maps'
);

select is(
  coalesce(
    (
      select array_agg(c.relname order by c.relname)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public' and
        c.relkind = 'r' and
        not (
          has_table_privilege('service_role', c.oid, 'SELECT') and
          has_table_privilege('service_role', c.oid, 'INSERT') and
          has_table_privilege('service_role', c.oid, 'UPDATE') and
          has_table_privilege('service_role', c.oid, 'DELETE')
        )
    ),
    '{}'::name[]
  ),
  '{}'::name[],
  'service_role has DML on every public table'
);

select * from finish();

rollback;
