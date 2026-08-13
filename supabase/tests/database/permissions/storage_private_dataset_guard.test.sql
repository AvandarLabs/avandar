\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Supabase Storage was a second, ungated read path to dataset content. The
-- `workspaces` bucket policies checked workspace MEMBERSHIP only, so any
-- member could download `<workspaceId>/datasets/<datasetId>.parquet` for a
-- dataset private to its owner. The Postgres row was hidden; the bytes were
-- not.
--
-- storage.objects is an ordinary RLS-protected table, so the boundary is
-- testable here directly.
--
-- See docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md

insert into auth.users (id, email, aud, role)
values
  ('b2000001-0000-4000-8000-000000000001'::uuid, 'b2_owner@test.dev', 'authenticated', 'authenticated'),
  ('b2000002-0000-4000-8000-000000000002'::uuid, 'b2_admin@test.dev', 'authenticated', 'authenticated'),
  ('b2000003-0000-4000-8000-000000000003'::uuid, 'b2_member@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'b2 workspace',
  'b2-storage-guard-ws'
);

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('b200cf01-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2 settings admin', false),
  ('b200cf02-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2 data editor', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('b200cf01-0000-4000-8000-000000000001'::uuid, 'settings'::public.app_type, 'admin'::public.role_level),
  ('b200cf01-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'admin'::public.role_level),
  ('b200cf02-0000-4000-8000-000000000002'::uuid, 'data_sources'::public.app_type, 'editor'::public.role_level);

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('b2002001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b200cf02-0000-4000-8000-000000000002'::uuid),
  ('b2002002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid, 'b200cf01-0000-4000-8000-000000000001'::uuid),
  ('b2002003-0000-4000-8000-000000000003'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000003-0000-4000-8000-000000000003'::uuid, 'b200cf02-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('b2003001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002001-0000-4000-8000-000000000001'::uuid, 'B2 Owner', 'B2 Owner'),
  ('b2003002-0000-4000-8000-000000000002'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002002-0000-4000-8000-000000000002'::uuid, 'B2 Admin', 'B2 Admin'),
  ('b2003003-0000-4000-8000-000000000003'::uuid, 'b2000003-0000-4000-8000-000000000003'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002003-0000-4000-8000-000000000003'::uuid, 'B2 Member', 'B2 Member');

-- ds_private is private to b2000001. ds_open is unrestricted.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('b2007001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b2003001-0000-4000-8000-000000000001'::uuid, 'private ds', 'virtual'::public.datasets__source_type, true),
  ('b2007002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b2003001-0000-4000-8000-000000000001'::uuid, 'open ds', 'virtual'::public.datasets__source_type, false);

insert into storage.buckets (id, name, public)
values ('workspaces', 'workspaces', false)
on conflict (id) do nothing;

-- Parquet objects for both, at the real path shape the client writes.
insert into storage.objects (bucket_id, name, owner)
values
  ('workspaces', 'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet', 'b2000001-0000-4000-8000-000000000001'::uuid),
  ('workspaces', 'b2001001-0000-4000-8000-000000000001/datasets/b2007002-0000-4000-8000-000000000002.parquet', 'b2000001-0000-4000-8000-000000000001'::uuid);

select plan(8);

-- The id extraction helper -------------------------------------------------

select is(
  public.util__storage_object_dataset_id (
    'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet'
  ),
  'b2007001-0000-4000-8000-000000000001'::uuid,
  'extracts the dataset id from a real object path'
);

select is(
  public.util__storage_object_dataset_id ('not/a/dataset-path.txt'),
  null::uuid,
  'returns null rather than raising on an unrecognised object name'
);

select is(
  public.util__storage_object_dataset_id (''),
  null::uuid,
  'returns null on an empty object name'
);

-- The leak, from a plain member -------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b2000003-0000-4000-8000-000000000003"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where name = 'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet'
  ),
  0,
  'a plain member cannot see the parquet of a dataset private to its owner'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where name = 'b2001001-0000-4000-8000-000000000001/datasets/b2007002-0000-4000-8000-000000000002.parquet'
  ),
  1,
  'a plain member CAN still see the parquet of an unrestricted dataset'
);

-- And from a Settings Admin, who the phase also excludes -------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b2000002-0000-4000-8000-000000000002"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where name = 'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet'
  ),
  0,
  'a settings admin cannot see the parquet of a dataset private to its owner'
);

-- The owner keeps full access ---------------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b2000001-0000-4000-8000-000000000001"}',
  true
);

select is(
  (
    select count(*)::int
    from storage.objects
    where name = 'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet'
  ),
  1,
  'the owner can still see their own private dataset parquet'
);

-- Writes are gated too, not only reads ------------------------------------

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"b2000003-0000-4000-8000-000000000003"}',
  true
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'workspaces',
      'b2001001-0000-4000-8000-000000000001/datasets/b2007001-0000-4000-8000-000000000001.parquet'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a plain member cannot overwrite the parquet of a private dataset'
);

select * from finish();

rollback;
