\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    '90000001-0000-4000-8000-000000000001'::uuid,
    'util_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '90000002-0000-4000-8000-000000000002'::uuid,
    'util_alice@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '90000003-0000-4000-8000-000000000003'::uuid,
    'util_bob@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '90000004-0000-4000-8000-000000000004'::uuid,
    'util_outsider@test.dev',
    'authenticated',
    'authenticated'
  );

insert into public.workspaces (id, owner_id, name, slug)
values (
  '90001001-0000-4000-8000-000000000001'::uuid,
  '90000001-0000-4000-8000-000000000001'::uuid,
  'util workspace',
  'util-eff-role-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    '90002001-0000-4000-8000-000000000001'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    '90002002-0000-4000-8000-000000000002'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    '90002003-0000-4000-8000-000000000003'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid
  );

insert into public.user_roles (
  workspace_id,
  user_id,
  membership_id,
  role
)
values
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90002001-0000-4000-8000-000000000001'::uuid,
    'admin'
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000002-0000-4000-8000-000000000002'::uuid,
    '90002002-0000-4000-8000-000000000002'::uuid,
    'admin'
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90002003-0000-4000-8000-000000000003'::uuid,
    'member'
  );

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = '90001001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when '90000001-0000-4000-8000-000000000001'::uuid then 'Global Admin'
    when '90000002-0000-4000-8000-000000000002'::uuid then 'Global Admin'
    else 'Global Viewer'
  end;

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
    '90003001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90002001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    '90003002-0000-4000-8000-000000000002'::uuid,
    '90000002-0000-4000-8000-000000000002'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90002002-0000-4000-8000-000000000002'::uuid,
    'Alice',
    'Alice'
  ),
  (
    '90003003-0000-4000-8000-000000000003'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90002003-0000-4000-8000-000000000003'::uuid,
    'Bob',
    'Bob'
  );

insert into public.user_groups (id, workspace_id, name, color)
values (
  '90004001-0000-4000-8000-000000000001'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'Tag Alpha',
  '#ff0000'
);

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config,
  is_restricted
)
values
  (
    '90005001-0000-4000-8000-000000000001'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000002-0000-4000-8000-000000000002'::uuid,
    '90003002-0000-4000-8000-000000000002'::uuid,
    't1 owner',
    '{}'::jsonb,
    false
  ),
  (
    '90005002-0000-4000-8000-000000000002'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't2 settings admin',
    '{}'::jsonb,
    false
  ),
  (
    '90005003-0000-4000-8000-000000000003'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't3 admin no tags',
    '{}'::jsonb,
    false
  ),
  (
    '90005004-0000-4000-8000-000000000004'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't4 admin tag no overlap',
    '{}'::jsonb,
    false
  ),
  (
    '90005005-0000-4000-8000-000000000005'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't5 editor overlap',
    '{}'::jsonb,
    false
  ),
  (
    '90005006-0000-4000-8000-000000000006'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't6 viewer restricted',
    '{}'::jsonb,
    true
  ),
  (
    '90005007-0000-4000-8000-000000000007'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't7 share restricted',
    '{}'::jsonb,
    true
  ),
  (
    '90005008-0000-4000-8000-000000000008'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't8 ws share max',
    '{}'::jsonb,
    false
  ),
  (
    '90005009-0000-4000-8000-000000000009'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't9 group share',
    '{}'::jsonb,
    false
  ),
  (
    '90005010-0000-4000-8000-000000000010'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000003-0000-4000-8000-000000000003'::uuid,
    '90003003-0000-4000-8000-000000000003'::uuid,
    't10 no grants',
    '{}'::jsonb,
    false
  );

insert into public.resource_user_group_tags (
  workspace_id,
  resource_type,
  resource_id,
  user_group_id
)
values
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005004-0000-4000-8000-000000000004'::uuid,
    '90004001-0000-4000-8000-000000000001'::uuid
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005005-0000-4000-8000-000000000005'::uuid,
    '90004001-0000-4000-8000-000000000001'::uuid
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005006-0000-4000-8000-000000000006'::uuid,
    '90004001-0000-4000-8000-000000000001'::uuid
  );

insert into public.resource_shares (
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role
)
values
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005007-0000-4000-8000-000000000007'::uuid,
    'user'::public.share_principal_type,
    '90000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005008-0000-4000-8000-000000000008'::uuid,
    'workspace'::public.share_principal_type,
    null,
    'viewer'::public.role_level
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005009-0000-4000-8000-000000000009'::uuid,
    'user_group'::public.share_principal_type,
    '90004001-0000-4000-8000-000000000001'::uuid,
    'viewer'::public.role_level
  );

insert into public.user_group_memberships (user_group_id, user_id)
values (
  '90004001-0000-4000-8000-000000000001'::uuid,
  '90000002-0000-4000-8000-000000000002'::uuid
);

select plan(11);

-- 1 Owner
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005001-0000-4000-8000-000000000001'::uuid
  )::text,
  'admin'::text,
  'owner short-circuit'
);

-- 2 Settings admin (alice settings admin only)
set local role postgres;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf02-0000-4000-8000-000000000002'::uuid;

delete from public.role_groups
where
  id = '9000cf02-0000-4000-8000-000000000002'::uuid;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf02-0000-4000-8000-000000000002'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t2_settings_admin',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values (
  '9000cf02-0000-4000-8000-000000000002'::uuid,
  'settings'::public.app_type,
  'admin'::public.role_level
);

update public.workspace_memberships
set
  role_group_id = '9000cf02-0000-4000-8000-000000000002'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005002-0000-4000-8000-000000000002'::uuid
  )::text,
  'admin'::text,
  'settings admin short-circuit'
);

-- 3 App admin, no resource tags
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf03-0000-4000-8000-000000000003'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t3_app_admin',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf03-0000-4000-8000-000000000003'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf03-0000-4000-8000-000000000003'::uuid,
    'dashboards'::public.app_type,
    'admin'::public.role_level
  ),
  (
    '9000cf03-0000-4000-8000-000000000003'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf03-0000-4000-8000-000000000003'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf03-0000-4000-8000-000000000003'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf02-0000-4000-8000-000000000002'::uuid;

delete from public.role_groups
where
  id = '9000cf02-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005003-0000-4000-8000-000000000003'::uuid
  )::text,
  'admin'::text,
  'app admin without tags'
);

-- 4 Admin but tags without overlap
set local role postgres;

delete from public.user_group_memberships
where
  user_group_id = '90004001-0000-4000-8000-000000000001'::uuid and
  user_id = '90000002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005004-0000-4000-8000-000000000004'::uuid
  ),
  null::public.role_level,
  'admin with tags but no overlap'
);

set local role postgres;

insert into public.user_group_memberships (user_group_id, user_id)
values (
  '90004001-0000-4000-8000-000000000001'::uuid,
  '90000002-0000-4000-8000-000000000002'::uuid
);

-- 5 Editor + overlapping tag
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf05-0000-4000-8000-000000000005'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t5_editor',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf05-0000-4000-8000-000000000005'::uuid,
    'dashboards'::public.app_type,
    'editor'::public.role_level
  ),
  (
    '9000cf05-0000-4000-8000-000000000005'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf05-0000-4000-8000-000000000005'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf05-0000-4000-8000-000000000005'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf05-0000-4000-8000-000000000005'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf03-0000-4000-8000-000000000003'::uuid;

delete from public.role_groups
where
  id = '9000cf03-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005005-0000-4000-8000-000000000005'::uuid
  )::text,
  'editor'::text,
  'editor with tag overlap'
);

-- 6 Viewer + restricted + overlap -> null (settings not admin)
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf06-0000-4000-8000-000000000006'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t6_viewer',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf06-0000-4000-8000-000000000006'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf06-0000-4000-8000-000000000006'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf06-0000-4000-8000-000000000006'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf06-0000-4000-8000-000000000006'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf06-0000-4000-8000-000000000006'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf05-0000-4000-8000-000000000005'::uuid;

delete from public.role_groups
where
  id = '9000cf05-0000-4000-8000-000000000005'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005006-0000-4000-8000-000000000006'::uuid
  ),
  null::public.role_level,
  'restricted removes tag-based viewer grant'
);

-- 7 Direct share on restricted
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005007-0000-4000-8000-000000000007'::uuid
  )::text,
  'viewer'::text,
  'direct share on restricted resource'
);

-- 8 Workspace share viewer + editor app role -> max editor
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf08-0000-4000-8000-000000000008'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t8_editor',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf08-0000-4000-8000-000000000008'::uuid,
    'dashboards'::public.app_type,
    'editor'::public.role_level
  ),
  (
    '9000cf08-0000-4000-8000-000000000008'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf08-0000-4000-8000-000000000008'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf08-0000-4000-8000-000000000008'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf08-0000-4000-8000-000000000008'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf06-0000-4000-8000-000000000006'::uuid;

delete from public.role_groups
where
  id = '9000cf06-0000-4000-8000-000000000006'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005008-0000-4000-8000-000000000008'::uuid
  )::text,
  'editor'::text,
  'max of workspace share and app role'
);

-- 9 Group share
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf09-0000-4000-8000-000000000009'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t9_viewer',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf09-0000-4000-8000-000000000009'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf09-0000-4000-8000-000000000009'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf09-0000-4000-8000-000000000009'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf09-0000-4000-8000-000000000009'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf09-0000-4000-8000-000000000009'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf08-0000-4000-8000-000000000008'::uuid;

delete from public.role_groups
where
  id = '9000cf08-0000-4000-8000-000000000008'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005009-0000-4000-8000-000000000009'::uuid
  )::text,
  'viewer'::text,
  'user_group share'
);

-- 10 No dashboards role
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf0a-0000-4000-8000-00000000000a'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t10_no_dashboards',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf0a-0000-4000-8000-00000000000a'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0a-0000-4000-8000-00000000000a'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0a-0000-4000-8000-00000000000a'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf0a-0000-4000-8000-00000000000a'::uuid
where
  id = '90002002-0000-4000-8000-000000000002'::uuid;

delete from public.role_group_app_roles
where
  role_group_id = '9000cf09-0000-4000-8000-000000000009'::uuid;

delete from public.role_groups
where
  id = '9000cf09-0000-4000-8000-000000000009'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005010-0000-4000-8000-000000000010'::uuid
  ),
  null::public.role_level,
  'no dashboards role and no applicable share'
);

-- 11 Non-member: workspace-wide share must not grant access
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000004-0000-4000-8000-000000000004"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005008-0000-4000-8000-000000000008'::uuid
  ),
  null::public.role_level,
  'outsider ignored workspace-wide share without membership'
);

select * from finish();

rollback;
