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

-- (Pre-cleanup: the legacy resource_user_group_tags table is gone. Cases that
-- used to depend on tag intersection now use user_group shares with
-- requires_app_access=true to encode the same gate. See cases 4 and 5 below.)

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

-- Fixture for requires_app_access truth table (cases 12-17). bob is the
-- subject; we vary bob's dashboards app role and his membership in the
-- Analytics user_group between cases.
insert into public.user_groups (id, workspace_id, name, color)
values (
  '90004002-0000-4000-8000-000000000002'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'Analytics',
  '#00ff00'
);

insert into public.user_group_memberships (user_group_id, user_id)
values (
  '90004002-0000-4000-8000-000000000002'::uuid,
  '90000003-0000-4000-8000-000000000003'::uuid
);

-- Six dashboards mirroring cases 12-17. The legacy tag intersection branch
-- has been removed; the workspace app-role candidate now applies
-- unconditionally on unrestricted resources, gated only by workspace
-- membership. The user_group share's requires_app_access flag is the
-- per-share gate that survives.
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
  -- 12: group share editor + requires_app_access=false, unrestricted.
  (
    '90005012-0000-4000-8000-000000000012'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90003001-0000-4000-8000-000000000001'::uuid,
    't12 raa=false no app role',
    '{}'::jsonb,
    false
  ),
  -- 13: group share editor + requires_app_access=true, member no app role.
  (
    '90005013-0000-4000-8000-000000000013'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90003001-0000-4000-8000-000000000001'::uuid,
    't13 raa=true no app role',
    '{}'::jsonb,
    true
  ),
  -- 14: group share editor + requires_app_access=true, member dashboards
  -- viewer. Unrestricted, so the gate is exercised: the share survives
  -- because bob has *some* dashboards app role, and the viewer app-role
  -- candidate participates in max alongside the editor share.
  (
    '90005014-0000-4000-8000-000000000014'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90003001-0000-4000-8000-000000000001'::uuid,
    't14 raa=true viewer app role unrestricted',
    '{}'::jsonb,
    false
  ),
  -- 15: group share editor + requires_app_access=true, member dashboards
  -- admin, restricted (so the admin app-role candidate is suppressed and the
  -- share is the only contributor).
  (
    '90005015-0000-4000-8000-000000000015'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90003001-0000-4000-8000-000000000001'::uuid,
    't15 raa=true admin app role restricted',
    '{}'::jsonb,
    true
  ),
  -- 16: same as 15 but UNRESTRICTED. The unrestricted app-role candidate
  -- (admin) participates in max alongside the editor share, so the answer
  -- is admin.
  (
    '90005016-0000-4000-8000-000000000016'::uuid,
    '90001001-0000-4000-8000-000000000001'::uuid,
    '90000001-0000-4000-8000-000000000001'::uuid,
    '90003001-0000-4000-8000-000000000001'::uuid,
    't16 raa=true admin app role unrestricted',
    '{}'::jsonb,
    false
  );
  -- (Case 17 covers a dataset and is inserted separately below.)

-- Case 17 dataset: unrestricted, no resource tags. Bob is in Analytics and
-- has no data_sources app role; the requires_app_access=true gate must drop
-- the share, and the app-role candidate also doesn't exist → null.
insert into public.datasets (
  id,
  owner_id,
  owner_profile_id,
  workspace_id,
  name,
  description,
  source_type,
  is_restricted
)
values (
  '90006017-0000-4000-8000-000000000017'::uuid,
  '90000001-0000-4000-8000-000000000001'::uuid,
  '90003001-0000-4000-8000-000000000001'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  't17 dataset raa=true no data_sources role',
  '',
  'csv_file'::public.datasets__source_type,
  false
);

insert into public.resource_shares (
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role,
  requires_app_access
)
values
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005012-0000-4000-8000-000000000012'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    false
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005013-0000-4000-8000-000000000013'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    true
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005014-0000-4000-8000-000000000014'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    true
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005015-0000-4000-8000-000000000015'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    true
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '90005016-0000-4000-8000-000000000016'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    true
  ),
  (
    '90001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    '90006017-0000-4000-8000-000000000017'::uuid,
    'user_group'::public.share_principal_type,
    '90004002-0000-4000-8000-000000000002'::uuid,
    'editor'::public.role_level,
    true
  );

select plan(20);

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

-- 4 App-admin role applies unconditionally on a resource that used to be
-- tagged (the tag mechanism is gone; only requires_app_access on user_group
-- shares preserves the "gate on app role" capability).
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
  )::text,
  'admin'::text,
  'app-admin applies unconditionally without tag intersection'
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
  'editor app role applies without tag intersection'
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
  'restricted resource suppresses workspace app-role candidate'
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

-- requires_app_access truth table cases (subject: bob, in Analytics group).
-- bob was untouched by tests 1-11 so he is still Global Viewer (dashboards:
-- viewer). Cases below move bob between custom role groups to drive the
-- truth table.

-- 12 user_group editor share, requires_app_access=false, bob has no
-- dashboards app role. Swap bob to a role group with no dashboards entry.
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf0c-0000-4000-8000-00000000000c'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t12_no_dashboards',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf0c-0000-4000-8000-00000000000c'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0c-0000-4000-8000-00000000000c'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0c-0000-4000-8000-00000000000c'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf0c-0000-4000-8000-00000000000c'::uuid
where
  id = '90002003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005012-0000-4000-8000-000000000012'::uuid
  )::text,
  'editor'::text,
  'requires_app_access=false grants share role without app role'
);

-- 13 user_group editor share, requires_app_access=true, bob has no app role.
select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005013-0000-4000-8000-000000000013'::uuid
  ),
  null::public.role_level,
  'requires_app_access=true blocks share when member has no app role'
);

-- 14 user_group editor share, requires_app_access=true, bob is dashboards
-- viewer. Resource is unrestricted with no resource tags: the share survives
-- the gate because bob has *some* dashboards app role, and the viewer
-- app-role candidate participates in max (share editor=2 vs viewer=1).
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf0e-0000-4000-8000-00000000000e'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t14_dashboards_viewer',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf0e-0000-4000-8000-00000000000e'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0e-0000-4000-8000-00000000000e'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0e-0000-4000-8000-00000000000e'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0e-0000-4000-8000-00000000000e'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf0e-0000-4000-8000-00000000000e'::uuid
where
  id = '90002003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005014-0000-4000-8000-000000000014'::uuid
  )::text,
  'editor'::text,
  'requires_app_access=true with member viewer app role yields share role (editor)'
);

-- 15 user_group editor share, requires_app_access=true, bob is dashboards
-- admin, resource restricted: app-role candidate is suppressed, share wins.
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf0f-0000-4000-8000-00000000000f'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t15_dashboards_admin',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf0f-0000-4000-8000-00000000000f'::uuid,
    'dashboards'::public.app_type,
    'admin'::public.role_level
  ),
  (
    '9000cf0f-0000-4000-8000-00000000000f'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0f-0000-4000-8000-00000000000f'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf0f-0000-4000-8000-00000000000f'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf0f-0000-4000-8000-00000000000f'::uuid
where
  id = '90002003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005015-0000-4000-8000-000000000015'::uuid
  )::text,
  'editor'::text,
  'requires_app_access=true with admin app role on restricted yields share role'
);

-- 16 Same as 15 but resource is unrestricted. Now the admin app-role
-- candidate participates in max alongside the editor share.
select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005016-0000-4000-8000-000000000016'::uuid
  )::text,
  'admin'::text,
  'unrestricted resource lets admin app role beat editor share'
);

-- 17 (dataset variant) user_group editor share on a dataset,
-- requires_app_access=true, bob is in Analytics but has NO data_sources app
-- role. Dataset is unrestricted; the requires-gate drops the share and the
-- app-role candidate is also absent → null.
set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9000cf11-0000-4000-8000-000000000011'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'util_eff_t17_no_data_sources',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9000cf11-0000-4000-8000-000000000011'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf11-0000-4000-8000-000000000011'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9000cf11-0000-4000-8000-000000000011'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9000cf11-0000-4000-8000-000000000011'::uuid
where
  id = '90002003-0000-4000-8000-000000000003'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dataset'::public.resource_type,
    '90006017-0000-4000-8000-000000000017'::uuid
  ),
  null::public.role_level,
  'dataset share requires_app_access=true dropped when member lacks data_sources app role'
);

-- ---------------------------------------------------------------------------
-- P1: Settings Admins do not get access to resources private to their owner.
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
-- ---------------------------------------------------------------------------
set local role postgres;

-- A dashboard owned by bob, restricted, with zero shares: private to bob.
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values (
  '90005090-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  '90000003-0000-4000-8000-000000000003'::uuid,
  (
    select up.id from public.user_profiles up
    where up.user_id = '90000003-0000-4000-8000-000000000003'::uuid
      and up.workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
  ),
  'bob private dashboard',
  '{}'::jsonb,
  true,
  'draft',
  null
);

-- Same, but public. Public is never private (spec 4.2).
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values (
  '90005091-0000-4000-8000-000000000091'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  '90000003-0000-4000-8000-000000000003'::uuid,
  (
    select up.id from public.user_profiles up
    where up.user_id = '90000003-0000-4000-8000-000000000003'::uuid
      and up.workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
  ),
  'bob public restricted dashboard',
  '{}'::jsonb,
  true,
  'public',
  '90005191-0000-4000-8000-000000000091'::uuid
);

-- Make alice a Settings Admin so the short-circuit is the grant under test.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values (
  '9000cf90-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'P1 Settings Admin',
  false
)
on conflict do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values (
  '9000cf90-0000-4000-8000-000000000090'::uuid,
  'settings'::public.app_type,
  'admin'::public.role_level
)
on conflict do nothing;

update public.workspace_memberships
   set role_group_id = '9000cf90-0000-4000-8000-000000000090'::uuid
 where workspace_id = '90001001-0000-4000-8000-000000000001'::uuid
   and user_id = '90000002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005090-0000-4000-8000-000000000090'::uuid
  ),
  null::public.role_level,
  'P1: settings admin gets no role on a dashboard private to its owner'
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005091-0000-4000-8000-000000000091'::uuid
  )::text,
  'admin'::text,
  'P1: settings admin keeps admin on a public dashboard even when restricted'
);

set local role postgres;

-- Sharing it to a third party stops it being private, so the admin returns.
insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  '90006090-0000-4000-8000-000000000090'::uuid,
  '90001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  '90005090-0000-4000-8000-000000000090'::uuid,
  'user',
  '90000001-0000-4000-8000-000000000001'::uuid,
  'viewer'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"90000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  public.util__resource_effective_role (
    'dashboard'::public.resource_type,
    '90005090-0000-4000-8000-000000000090'::uuid
  )::text,
  'admin'::text,
  'P1: settings admin regains admin once the resource is shared with anyone'
);

set local role postgres;

select * from finish();

rollback;
