\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'a7000001-0000-4000-8000-000000000001'::uuid,
    'rls3_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'a7000002-0000-4000-8000-000000000002'::uuid,
    'rls3_viewer@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'a7000003-0000-4000-8000-000000000003'::uuid,
    'rls3_editor@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'a7000001-0000-4000-8000-000000000001'::uuid,
  'rls phase3 ws',
  'rls-phase3-ws'
)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'a7002001-0000-4000-8000-000000000001'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'a7002002-0000-4000-8000-000000000002'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'a7002003-0000-4000-8000-000000000003'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000003-0000-4000-8000-000000000003'::uuid
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
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000001-0000-4000-8000-000000000001'::uuid,
    'a7002001-0000-4000-8000-000000000001'::uuid,
    'admin'
  ),
  (
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000002-0000-4000-8000-000000000002'::uuid,
    'a7002002-0000-4000-8000-000000000002'::uuid,
    'member'
  ),
  (
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000003-0000-4000-8000-000000000003'::uuid,
    'a7002003-0000-4000-8000-000000000003'::uuid,
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
    'a7003001-0000-4000-8000-000000000001'::uuid,
    'a7000001-0000-4000-8000-000000000001'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7002001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'a7003002-0000-4000-8000-000000000002'::uuid,
    'a7000002-0000-4000-8000-000000000002'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7002002-0000-4000-8000-000000000002'::uuid,
    'Viewer',
    'Viewer'
  ),
  (
    'a7003003-0000-4000-8000-000000000003'::uuid,
    'a7000003-0000-4000-8000-000000000003'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7002003-0000-4000-8000-000000000003'::uuid,
    'Editor',
    'Editor'
  )
on conflict (id) do nothing;

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'a7001001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'a7000001-0000-4000-8000-000000000001'::uuid then 'Global Admin'
    when 'a7000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config,
  is_restricted,
  is_public
)
values
  (
    'a7004001-0000-4000-8000-000000000001'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000001-0000-4000-8000-000000000001'::uuid,
    'a7003001-0000-4000-8000-000000000001'::uuid,
    'open dash',
    '{}'::jsonb,
    false,
    false
  ),
  (
    'a7004002-0000-4000-8000-000000000002'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7000001-0000-4000-8000-000000000001'::uuid,
    'a7003001-0000-4000-8000-000000000001'::uuid,
    'restricted dash',
    '{}'::jsonb,
    true,
    false
  )
on conflict (id) do nothing;

select plan(6);

-- 1 legacy shim admin includes workspace for owner
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000001-0000-4000-8000-000000000001"}',
  true
);

select ok(
  'a7001001-0000-4000-8000-000000000001'::uuid = any (
    public.util__get_auth_user_workspaces_by_role ('admin')
  ),
  'owner in legacy admin workspace list'
);

-- 2 Global viewer not in legacy admin list
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000002-0000-4000-8000-000000000002"}',
  true
);

select ok(
  not (
    'a7001001-0000-4000-8000-000000000001'::uuid = any (
      public.util__get_auth_user_workspaces_by_role ('admin')
    )
  ),
  'global viewer excluded from legacy admin list'
);

-- 3 viewer can select unrestricted dashboard
select is(
  (
    select count(*)::int
    from public.dashboards d
    where
      d.id = 'a7004001-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'viewer sees unrestricted dashboard via RLS select'
);

-- 4 viewer cannot select restricted dashboard without share
select is(
  (
    select count(*)::int
    from public.dashboards d
    where
      d.id = 'a7004002-0000-4000-8000-000000000002'::uuid
  ),
  0,
  'viewer does not see restricted dashboard without grant'
);

-- 5 viewer lacks editor role on unrestricted dashboard (helper mirrors RLS)
select ok(
  not public.util__auth_user_can_access_resource (
    'dashboard'::public.resource_type,
    'a7004001-0000-4000-8000-000000000001'::uuid,
    'editor'::public.role_level
  ),
  'viewer cannot edit unrestricted dashboard'
);

-- 6 editor can edit unrestricted dashboard they do not own
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a7000003-0000-4000-8000-000000000003"}',
  true
);

select ok(
  public.util__auth_user_can_access_resource (
    'dashboard'::public.resource_type,
    'a7004001-0000-4000-8000-000000000001'::uuid,
    'editor'::public.role_level
  ),
  'editor can edit unrestricted dashboard'
);

select * from finish();

rollback;
