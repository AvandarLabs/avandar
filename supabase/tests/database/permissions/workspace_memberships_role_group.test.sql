\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'e1000001-0000-4000-8000-000000000001'::uuid,
    'wmrg_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'wmrg_member@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'e2000001-0000-4000-8000-000000000001'::uuid,
  'e1000001-0000-4000-8000-000000000001'::uuid,
  'wmrg workspace',
  'wmrg-ws-test'
)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid
  )
on conflict (id) do nothing;

insert into public.user_roles (
  workspace_id,
  user_id,
  membership_id,
  role
)
values
  (
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'admin'
  ),
  (
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'member'
  )
on conflict (membership_id) do nothing;

insert into public.user_profiles (
  id,
  user_id,
  workspace_id,
  membership_id,
  full_name,
  display_name
)
values
  (
    'e4000001-0000-4000-8000-000000000001'::uuid,
    'e1000001-0000-4000-8000-000000000001'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e3000001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'e4000002-0000-4000-8000-000000000002'::uuid,
    'e1000002-0000-4000-8000-000000000002'::uuid,
    'e2000001-0000-4000-8000-000000000001'::uuid,
    'e3000002-0000-4000-8000-000000000002'::uuid,
    'Member',
    'Member'
  )
on conflict (id) do nothing;

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'e2000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e1000001-0000-4000-8000-000000000001'::uuid then 'Global Admin'
    else 'Global Viewer'
  end;

select plan(4);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_class c
    inner join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where
      n.nspname = 'public' and
      c.relname = 'user_app_roles' and
      c.relkind = 'r'
  ),
  'user_app_roles table must be absent'
);

select has_column(
  'workspace_memberships'::name,
  'role_group_id'::name
);

select ok(
  (
    select public.workspace_memberships.role_group_id is not null
    from public.workspace_memberships
    where
      public.workspace_memberships.id =
        'e3000001-0000-4000-8000-000000000001'::uuid
  ),
  'owner membership has role_group_id'
);

create temp table wmrg_guard as
select
  role_group_id as expected_rg
from
  public.workspace_memberships
where
  id = 'e3000002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"e1000002-0000-4000-8000-000000000002"}',
  true
);

update public.workspace_memberships
set
  role_group_id = (
    select rg.id
    from public.role_groups rg
    where
      rg.workspace_id =
        'e2000001-0000-4000-8000-000000000001'::uuid and
      rg.is_builtin and
      rg.name = 'Global Editor'
  )
where
  id = 'e3000002-0000-4000-8000-000000000002'::uuid;

set local role postgres;

select is(
  (
    select wm.role_group_id
    from public.workspace_memberships wm
    where
      wm.id = 'e3000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    select g.expected_rg
    from wmrg_guard g
  ),
  'member self-update must not change role_group_id under RLS'
);

select * from finish();

rollback;
