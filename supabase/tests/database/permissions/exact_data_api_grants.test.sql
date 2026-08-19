\set ON_ERROR_STOP on

/**
 * Exact Data API grant contract for every public table and analytics view.
 *
 * Positive-only privilege checks cannot detect inherited TRUNCATE, REFERENCES,
 * or TRIGGER privileges. These assertions compare complete ACL sets and the
 * migration owner's relation defaults so a new object cannot silently inherit
 * broader access.
 */
begin;

set search_path to extensions, public;

select plan(5);

with public_tables as (
  select
    c.relname::text as table_name
  from
    pg_class c
    join pg_namespace n on n.oid = c.relnamespace
  where
    n.nspname = 'public' and
    c.relkind in ('r', 'p')
), standard_authenticated_tables as (
  select
    table_name
  from
    public_tables
  where
    table_name not in (
      'catalog_entries__dataset_column',
      'catalog_entries__open_data',
      'subscriptions',
      'usage_analytics_events',
      'user_group_memberships',
      'user_nux_progress'
    )
), expected_table_privileges as (
  select
    table_name,
    'service_role'::text as grantee,
    privilege_type,
    false as is_grantable
  from
    public_tables
    cross join unnest(array['DELETE', 'INSERT', 'SELECT', 'UPDATE']) as privileges (privilege_type)
  union all
  select
    table_name,
    'authenticated',
    privilege_type,
    false
  from
    standard_authenticated_tables
    cross join unnest(array['DELETE', 'INSERT', 'SELECT', 'UPDATE']) as privileges (privilege_type)
  union all
  select
    table_name,
    'authenticated',
    'SELECT',
    false
  from
    public_tables
  where
    table_name in (
      'catalog_entries__dataset_column',
      'catalog_entries__open_data',
      'subscriptions',
      'usage_analytics_events'
    )
  union all
  select
    'user_group_memberships',
    'authenticated',
    privilege_type,
    false
  from
    unnest(array['DELETE', 'INSERT', 'SELECT']) as privileges (privilege_type)
  union all
  select
    'user_nux_progress',
    'authenticated',
    privilege_type,
    false
  from
    unnest(array['INSERT', 'SELECT', 'UPDATE']) as privileges (privilege_type)
  union all
  select
    'dashboards',
    'anon',
    'SELECT',
    false
), actual_table_privileges as (
  select
    table_name::text,
    grantee::text,
    privilege_type::text,
    is_grantable = 'YES' as is_grantable
  from
    information_schema.table_privileges
  where
    table_schema = 'public' and
    grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
)
select is(
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(actual_table_privileges) order by table_name, grantee, privilege_type)
      from
        actual_table_privileges
    ),
    '[]'::jsonb
  ),
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(expected_table_privileges) order by table_name, grantee, privilege_type)
      from
        expected_table_privileges
    ),
    '[]'::jsonb
  ),
  'public table privileges exactly match the Data API matrix'
);

with expected_column_privileges as (
  select
    'usage_analytics_events'::text as table_name,
    column_name,
    'authenticated'::text as grantee,
    'INSERT'::text as privilege_type,
    false as is_grantable
  from
    unnest(
      array[
        'app',
        'app_version',
        'client',
        'event_name',
        'payload',
        'user_id',
        'workspace_id'
      ]
    ) as columns (column_name)
), actual_column_privileges as (
  select
    c.relname::text as table_name,
    a.attname::text as column_name,
    case
      when acl.grantee = 0 then 'PUBLIC'
      else acl.grantee::regrole::text
    end as grantee,
    acl.privilege_type::text,
    acl.is_grantable
  from
    pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(a.attacl) acl
  where
    n.nspname = 'public' and
    a.attnum > 0 and
    not a.attisdropped and
    (
      acl.grantee = 0 or
      acl.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
    )
)
select is(
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(actual_column_privileges) order by table_name, column_name, grantee, privilege_type)
      from
        actual_column_privileges
    ),
    '[]'::jsonb
  ),
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(expected_column_privileges) order by table_name, column_name, grantee, privilege_type)
      from
        expected_column_privileges
    ),
    '[]'::jsonb
  ),
  'explicit column privileges exactly match the analytics event insert contract'
);

with analytics_views as (
  select
    c.relname::text as table_name
  from
    pg_class c
    join pg_namespace n on n.oid = c.relnamespace
  where
    n.nspname = 'analytics' and
    c.relkind = 'v'
), expected_view_privileges as (
  select
    table_name,
    'service_role'::text as grantee,
    'SELECT'::text as privilege_type,
    false as is_grantable
  from
    analytics_views
), actual_view_privileges as (
  select
    table_name::text,
    grantee::text,
    privilege_type::text,
    is_grantable = 'YES' as is_grantable
  from
    information_schema.table_privileges
  where
    table_schema = 'analytics' and
    grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
)
select is(
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(actual_view_privileges) order by table_name, grantee, privilege_type)
      from
        actual_view_privileges
    ),
    '[]'::jsonb
  ),
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(expected_view_privileges) order by table_name, grantee, privilege_type)
      from
        expected_view_privileges
    ),
    '[]'::jsonb
  ),
  'analytics view privileges grant only SELECT to service_role'
);

with expected_schema_privileges as (
  select
    'analytics'::text as schema_name,
    'service_role'::text as grantee,
    'USAGE'::text as privilege_type,
    false as is_grantable
), actual_schema_privileges as (
  select
    n.nspname::text as schema_name,
    case
      when acl.grantee = 0 then 'PUBLIC'
      else acl.grantee::regrole::text
    end as grantee,
    acl.privilege_type::text,
    acl.is_grantable
  from
    pg_namespace n
    cross join lateral aclexplode(n.nspacl) acl
  where
    n.nspname = 'analytics' and
    (
      acl.grantee = 0 or
      acl.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
    )
)
select is(
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(actual_schema_privileges) order by schema_name, grantee, privilege_type)
      from
        actual_schema_privileges
    ),
    '[]'::jsonb
  ),
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(expected_schema_privileges) order by schema_name, grantee, privilege_type)
      from
        expected_schema_privileges
    ),
    '[]'::jsonb
  ),
  'analytics schema privileges grant only USAGE to service_role'
);

with migration_owner_default_privileges as (
  select
    n.nspname::text as schema_name,
    case
      when acl.grantee = 0 then 'PUBLIC'
      else acl.grantee::regrole::text
    end as grantee,
    acl.privilege_type::text,
    acl.is_grantable
  from
    pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
  where
    d.defaclrole = 'postgres'::regrole and
    -- Relations and sequences. Functions are deliberately excluded: Postgres
    -- grants EXECUTE to PUBLIC on every new function and `alter default
    -- privileges` cannot suppress that, so a function's own schema file has to
    -- revoke it. See `00.default_privileges.sql`.
    d.defaclobjtype in ('r', 'S') and
    n.nspname in ('public', 'analytics') and
    (
      acl.grantee = 0 or
      acl.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
    )
)
select is(
  coalesce(
    (
      select
        jsonb_agg(to_jsonb(migration_owner_default_privileges) order by schema_name, grantee, privilege_type)
      from
        migration_owner_default_privileges
    ),
    '[]'::jsonb
  ),
  '[]'::jsonb,
  'migration-owned relations and sequences inherit no Data API grants'
);

select * from finish();

rollback;
