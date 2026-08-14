\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Fixtures. Prefix 92 keeps these distinct within this file.
--
-- Every insert below has to satisfy the resource_shares validation triggers
-- before the requires_app_access check constraint is ever reached, so the
-- workspace, the dataset, the member, and the user group all have to be real
-- rows in the same workspace. Without them the triggers raise 23514 first and
-- the throws_ok assertions would pass without exercising the constraint.
insert into auth.users (id, email, aud, role)
values (
  '92000001-0000-4000-8000-000000000001'::uuid,
  'requires_app_access_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  'requires_app_access_ws',
  'requires-app-access-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  '92002001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid
);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values (
  '92003001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92002001-0000-4000-8000-000000000001'::uuid,
  'Requires App Access Owner',
  'Requires App Access Owner'
);

insert into public.user_groups (id, workspace_id, name, color)
values (
  '92004001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  'requires_app_access group',
  '#000000'
);

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values (
  '92005001-0000-4000-8000-000000000001'::uuid,
  '92001001-0000-4000-8000-000000000001'::uuid,
  '92000001-0000-4000-8000-000000000001'::uuid,
  '92003001-0000-4000-8000-000000000001'::uuid,
  'requires_app_access dataset',
  'csv_file'::public.datasets__source_type
);

select plan(7);

-- Column exists with the right type and default.
select has_column(
  'public',
  'resource_shares',
  'requires_app_access',
  'resource_shares.requires_app_access exists'
);

select col_type_is(
  'public',
  'resource_shares',
  'requires_app_access',
  'boolean',
  'requires_app_access is boolean'
);

select col_default_is(
  'public',
  'resource_shares',
  'requires_app_access',
  'false',
  'requires_app_access defaults to false'
);

select col_not_null(
  'public',
  'resource_shares',
  'requires_app_access',
  'requires_app_access is not null'
);

-- Check constraint blocks requires_app_access=true for non-group principals.
prepare insert_user_with_flag as
  insert into public.resource_shares (
    workspace_id,
    resource_type,
    resource_id,
    principal_type,
    principal_id,
    role,
    requires_app_access
  ) values (
    '92001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    '92005001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    '92000001-0000-4000-8000-000000000001'::uuid,
    'viewer'::public.role_level,
    true
  );

select throws_ok(
  'insert_user_with_flag',
  '23514',
  'new row for relation "resource_shares" violates check constraint "resource_shares__requires_app_access_only_for_groups"',
  'cannot set requires_app_access on user principal'
);

prepare insert_workspace_with_flag as
  insert into public.resource_shares (
    workspace_id,
    resource_type,
    resource_id,
    principal_type,
    principal_id,
    role,
    requires_app_access
  ) values (
    '92001001-0000-4000-8000-000000000001'::uuid,
    'dataset'::public.resource_type,
    '92005001-0000-4000-8000-000000000001'::uuid,
    'workspace'::public.share_principal_type,
    null,
    'viewer'::public.role_level,
    true
  );

select throws_ok(
  'insert_workspace_with_flag',
  '23514',
  'new row for relation "resource_shares" violates check constraint "resource_shares__requires_app_access_only_for_groups"',
  'cannot set requires_app_access on workspace principal'
);

-- requires_app_access=true is allowed for user_group principals.
select lives_ok(
  $$
    insert into public.resource_shares (
      workspace_id,
      resource_type,
      resource_id,
      principal_type,
      principal_id,
      role,
      requires_app_access
    ) values (
      '92001001-0000-4000-8000-000000000001'::uuid,
      'dataset'::public.resource_type,
      '92005001-0000-4000-8000-000000000001'::uuid,
      'user_group'::public.share_principal_type,
      '92004001-0000-4000-8000-000000000001'::uuid,
      'editor'::public.role_level,
      true
    )
  $$,
  'requires_app_access=true allowed on user_group principal'
);

select * from finish();

rollback;
