\set ON_ERROR_STOP on

/**
 * The `case_types` and `case_records` apps exist in `app_type`, and a new
 * workspace's built-in role groups are seeded with both.
 */
begin;

set search_path to extensions, public;

select plan(3);

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

-- A new workspace's built-in groups get both case apps at their own tier.
insert into auth.users (id, email, aud, role)
values (
  'ca100001-0000-4000-8000-000000000001'::uuid,
  'case_app_roles@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'ca101001-0000-4000-8000-000000000001'::uuid,
  'ca100001-0000-4000-8000-000000000001'::uuid,
  'case app roles pgtap workspace',
  'case-app-roles-pgtap-workspace'
);

select results_eq(
  $$
    select rg.name, rgar.app::text, rgar.role::text
    from public.role_groups rg
      join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = 'ca101001-0000-4000-8000-000000000001'::uuid and
      rgar.app::text in ('case_types', 'case_records')
    order by rg.name, rgar.app::text
  $$,
  $$
    values
      ('Global Admin'::text, 'case_records'::text, 'admin'::text),
      ('Global Admin', 'case_types', 'admin'),
      ('Global Editor', 'case_records', 'editor'),
      ('Global Editor', 'case_types', 'editor'),
      ('Global Viewer', 'case_records', 'viewer'),
      ('Global Viewer', 'case_types', 'viewer')
  $$,
  'built-in role groups are seeded with both case apps at their own tier'
);

select * from finish();

rollback;
