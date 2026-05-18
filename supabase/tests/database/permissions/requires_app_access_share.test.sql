\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

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
    gen_random_uuid(),
    'dataset'::public.resource_type,
    gen_random_uuid(),
    'user'::public.share_principal_type,
    gen_random_uuid(),
    'viewer'::public.role_level,
    true
  );

select throws_ok(
  'insert_user_with_flag',
  '23514',
  null,
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
    gen_random_uuid(),
    'dataset'::public.resource_type,
    gen_random_uuid(),
    'workspace'::public.share_principal_type,
    null,
    'viewer'::public.role_level,
    true
  );

select throws_ok(
  'insert_workspace_with_flag',
  '23514',
  null,
  'cannot set requires_app_access on workspace principal'
);

-- requires_app_access=true is allowed for user_group principals.
-- Seed a minimal workspace so the workspace_id FK on resource_shares is
-- satisfied; the principal_id is intentionally not a real user_group row
-- because resource_shares.principal_id has no foreign key to user_groups.
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
      gen_random_uuid(),
      'user_group'::public.share_principal_type,
      gen_random_uuid(),
      'editor'::public.role_level,
      true
    )
  $$,
  'requires_app_access=true allowed on user_group principal'
);

select * from finish();

rollback;
