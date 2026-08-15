\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(8);

select ok(
  not has_function_privilege(
    'anon',
    'public.util__seed_builtin_role_groups_for_workspace(uuid)',
    'EXECUTE'
  ),
  'anon cannot execute the built-in role group seeder'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.util__seed_builtin_role_groups_for_workspace(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute the built-in role group seeder'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.util__seed_builtin_role_groups_for_workspace(uuid)',
    'EXECUTE'
  ),
  'service_role can execute the built-in role group seeder'
);

-- The enum label exists.
select ok(
  'gis' = any (
    select enumlabel::text
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_type'
  ),
  'app_type includes gis'
);

-- Seeding a fresh workspace grants gis at each built-in tier.
insert into auth.users (id, email, aud, role)
values (
  '91000001-0000-4000-8000-000000000001'::uuid,
  'gis_app_role@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (owner_id, name, slug)
values (
  '91000001-0000-4000-8000-000000000001'::uuid,
  'gis pgtap workspace',
  'gis-pgtap-workspace'
);

select is(
  (
    select rgar.role::text
    from public.role_groups rg
    join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = (
        select id
        from public.workspaces
        where slug = 'gis-pgtap-workspace'
      ) and
      rg.name = 'Global Admin' and
      rgar.app = 'gis'
  ),
  'admin',
  'Global Admin is seeded with gis admin'
);

select is(
  (
    select rgar.role::text
    from public.role_groups rg
    join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = (
        select id
        from public.workspaces
        where slug = 'gis-pgtap-workspace'
      ) and
      rg.name = 'Global Editor' and
      rgar.app = 'gis'
  ),
  'editor',
  'Global Editor is seeded with gis editor'
);

select is(
  (
    select rgar.role::text
    from public.role_groups rg
    join public.role_group_app_roles rgar on rgar.role_group_id = rg.id
    where
      rg.workspace_id = (
        select id
        from public.workspaces
        where slug = 'gis-pgtap-workspace'
      ) and
      rg.name = 'Global Viewer' and
      rgar.app = 'gis'
  ),
  'viewer',
  'Global Viewer is seeded with gis viewer'
);

-- The backfill invariant: every dashboards role has the same gis role.
select is(
  (
    select count(*)
    from public.role_group_app_roles dashboards_role
      left join public.role_group_app_roles gis_role on
        gis_role.role_group_id = dashboards_role.role_group_id and
        gis_role.app = 'gis'
    where dashboards_role.app = 'dashboards' and
      gis_role.role is distinct from dashboards_role.role
  ),
  0::bigint,
  'every dashboards role is mirrored exactly by gis'
);

select * from finish();

rollback;
