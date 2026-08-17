-- Recreate dashboards before snapshot_revision existed with public, workspace,
-- and draft rows used to verify migration backfill behavior.
begin;

set search_path to extensions, public;

alter table public.dashboards drop column snapshot_revision cascade;

insert into auth.users (id, email, aud, role)
values (
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5_owner@test.dev',
  'authenticated',
  'authenticated'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'F5 migration workspace',
  'f5-snapshot-revision-migration'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid
);

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values (
  'f5003001-0000-4000-8000-000000000001'::uuid,
  'f5000001-0000-4000-8000-000000000001'::uuid,
  'f5001001-0000-4000-8000-000000000001'::uuid,
  'f5002001-0000-4000-8000-000000000001'::uuid,
  'F5 Owner',
  'F5 Owner'
);

insert into public.dashboards (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  config,
  visibility,
  is_restricted
)
values
  (
    'f5004001-0000-4000-8000-000000000001'::uuid,
    'f5001001-0000-4000-8000-000000000001'::uuid,
    'f5000001-0000-4000-8000-000000000001'::uuid,
    'f5003001-0000-4000-8000-000000000001'::uuid,
    'F5 public dashboard',
    '{}'::jsonb,
    'public'::public.dashboard_visibility,
    false
  ),
  (
    'f5004002-0000-4000-8000-000000000002'::uuid,
    'f5001001-0000-4000-8000-000000000001'::uuid,
    'f5000001-0000-4000-8000-000000000001'::uuid,
    'f5003001-0000-4000-8000-000000000001'::uuid,
    'F5 workspace dashboard',
    '{}'::jsonb,
    'workspace'::public.dashboard_visibility,
    false
  ),
  (
    'f5004003-0000-4000-8000-000000000003'::uuid,
    'f5001001-0000-4000-8000-000000000001'::uuid,
    'f5000001-0000-4000-8000-000000000001'::uuid,
    'f5003001-0000-4000-8000-000000000001'::uuid,
    'F5 draft dashboard',
    '{}'::jsonb,
    'draft'::public.dashboard_visibility,
    false
  );
