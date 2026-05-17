\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixture: owner (creator), bob (subject), and a workspace with one dataset
-- and one dashboard. We control bob's role group between tests to flip the
-- data_sources / dashboards app role from absent to present.

insert into auth.users (id, email, aud, role)
values
  (
    '92000001-0000-4000-8000-000000000001'::uuid,
    'shared_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '92000002-0000-4000-8000-000000000002'::uuid,
    'shared_bob@test.dev',
    'authenticated',
    'authenticated'
  );

insert into public.workspaces (id, owner_id, name, slug)
values (
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  'shared with me ws',
  'rpc-shared-with-me-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    '92002001-0000-4000-8000-000000000001'::uuid,
    '92001001-0000-4000-8000-000000000001'::uuid,
    '92000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    '92002002-0000-4000-8000-000000000002'::uuid,
    '92001001-0000-4000-8000-000000000001'::uuid,
    '92000002-0000-4000-8000-000000000002'::uuid
  );

-- Owner gets the built-in Global Admin role group.
update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.id = '92002001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Admin';

-- Bob starts with NO app role at all (empty custom role group). This is the
-- "share only" state we use for cases 1 and 3.
insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9200cf01-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  'rpc_shared_t1_empty',
  false
);

-- Settings viewer is required for the user to satisfy the membership-level
-- visibility checks; data_sources / dashboards are intentionally absent.
insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values (
  '9200cf01-0000-4000-8000-000000000001'::uuid,
  'settings'::public.app_type,
  'viewer'::public.role_level
);

update public.workspace_memberships
set
  role_group_id = '9200cf01-0000-4000-8000-000000000001'::uuid
where
  id = '92002002-0000-4000-8000-000000000002'::uuid;

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
    '92003001-0000-4000-8000-000000000001'::uuid,
    '92000001-0000-4000-8000-000000000001'::uuid,
    '92001001-0000-4000-8000-000000000001'::uuid,
    '92002001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    '92003002-0000-4000-8000-000000000002'::uuid,
    '92000002-0000-4000-8000-000000000002'::uuid,
    '92001001-0000-4000-8000-000000000001'::uuid,
    '92002002-0000-4000-8000-000000000002'::uuid,
    'Bob',
    'Bob'
  );

-- One dataset owned by the owner; bob receives a direct viewer share.
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
  '92006001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  '92003001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  'Shared dataset',
  '',
  'csv_file'::public.datasets__source_type,
  false
);

-- One dashboard owned by the owner; bob receives a direct viewer share.
insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config,
  is_restricted
)
values (
  '92005001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  '92003001-0000-4000-8000-000000000001'::uuid,
  'Shared dashboard',
  '{}'::jsonb,
  false
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
    '92001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    '92006001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    '92000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    '92001001-0000-4000-8000-000000000001'::uuid,
    'dashboard'::public.resource_type,
    '92005001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    '92000002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  );

select plan(6);

-- ---------------------------------------------------------------------------
-- Case 1: bob has no data_sources / dashboards app role + direct viewer
-- shares on both. The RPC should return both rows with effective_role=viewer.
-- ---------------------------------------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"92000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
  ),
  2,
  'no app role + two direct shares → two rows'
);

select is(
  (
    select effective_role::text
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
    where resource_type = 'dataset'::public.resource_type
  ),
  'viewer',
  'dataset share returned with effective_role=viewer'
);

select is(
  (
    select effective_role::text
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
    where resource_type = 'dashboard'::public.resource_type
  ),
  'viewer',
  'dashboard share returned with effective_role=viewer'
);

-- ---------------------------------------------------------------------------
-- Case 2: give bob `data_sources: viewer` while keeping the dataset share.
-- The dataset should NOT be listed (he can find it via the main app), but
-- the dashboard share should still be listed (no dashboards app role).
-- ---------------------------------------------------------------------------

set local role postgres;

insert into public.role_groups (
  id,
  workspace_id,
  name,
  is_builtin
) values (
  '9200cf02-0000-4000-8000-000000000002'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  'rpc_shared_t2_data_sources_viewer',
  false
);

insert into public.role_group_app_roles (
  role_group_id,
  app,
  role
) values
  (
    '9200cf02-0000-4000-8000-000000000002'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '9200cf02-0000-4000-8000-000000000002'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set
  role_group_id = '9200cf02-0000-4000-8000-000000000002'::uuid
where
  id = '92002002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"92000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
    where resource_type = 'dataset'::public.resource_type
  ),
  0,
  'with data_sources app role, dataset is no longer listed'
);

select is(
  (
    select count(*)::int
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
    where resource_type = 'dashboard'::public.resource_type
  ),
  1,
  'dashboard share still listed when only data_sources role is present'
);

-- ---------------------------------------------------------------------------
-- Case 3: remove every share, restore bob to the empty role group. The user
-- has no app roles on either app and no shares → empty set.
-- ---------------------------------------------------------------------------

set local role postgres;

delete from public.resource_shares
where
  workspace_id = '92001001-0000-4000-8000-000000000001'::uuid;

update public.workspace_memberships
set
  role_group_id = '9200cf01-0000-4000-8000-000000000001'::uuid
where
  id = '92002002-0000-4000-8000-000000000002'::uuid;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"92000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from public.rpc__list_shared_with_me (
      '92001001-0000-4000-8000-000000000001'::uuid
    )
  ),
  0,
  'no app roles and no shares → empty set'
);

select * from finish();

rollback;
