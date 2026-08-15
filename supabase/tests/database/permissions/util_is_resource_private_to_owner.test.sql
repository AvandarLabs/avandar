\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a2000001-0000-4000-8000-000000000001'::uuid, 'a2_owner@test.dev', 'authenticated', 'authenticated'),
  ('a2000002-0000-4000-8000-000000000002'::uuid, 'a2_other@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a2001001-0000-4000-8000-000000000001'::uuid,
  'a2000001-0000-4000-8000-000000000001'::uuid,
  'a2 workspace',
  'a2-private-to-owner-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a2002001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid),
  ('a2002002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('a2003001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2002001-0000-4000-8000-000000000001'::uuid, 'A2 Owner', 'A2 Owner'),
  ('a2003002-0000-4000-8000-000000000002'::uuid, 'a2000002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2002002-0000-4000-8000-000000000002'::uuid, 'A2 Other', 'A2 Other');

-- d1 restricted no shares (private), d2 restricted + share (not private),
-- d3 unrestricted no shares (not private), d4 public + restricted no shares
-- (generic predicate still says private; callers add the visibility term).
insert into public.dashboards (
  id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted,
  visibility, snapshot_revision
)
values
  ('a2005001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'private', '{}'::jsonb, true, 'draft', null),
  ('a2005002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'shared', '{}'::jsonb, true, 'draft', null),
  ('a2005003-0000-4000-8000-000000000003'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'unrestricted', '{}'::jsonb, false, 'draft', null),
  ('a2005004-0000-4000-8000-000000000004'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'public restricted', '{}'::jsonb, true, 'public', 'a2005104-0000-4000-8000-000000000004'::uuid);

insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'a2006002-0000-4000-8000-000000000002'::uuid,
  'a2001001-0000-4000-8000-000000000001'::uuid,
  'dashboard',
  'a2005002-0000-4000-8000-000000000002'::uuid,
  'user',
  'a2000002-0000-4000-8000-000000000002'::uuid,
  'viewer'
);

-- Datasets: one private, one unrestricted. `datasets` has no is_public column.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('a2007001-0000-4000-8000-000000000001'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'private ds', 'virtual', true),
  ('a2007002-0000-4000-8000-000000000002'::uuid, 'a2001001-0000-4000-8000-000000000001'::uuid, 'a2000001-0000-4000-8000-000000000001'::uuid, 'a2003001-0000-4000-8000-000000000001'::uuid, 'open ds', 'virtual', false);

select plan(9);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005001-0000-4000-8000-000000000001'::uuid),
  true,
  'dashboard restricted with no shares is private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005002-0000-4000-8000-000000000002'::uuid),
  false,
  'dashboard with a non-owner share is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005003-0000-4000-8000-000000000003'::uuid),
  false,
  'unrestricted dashboard is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005004-0000-4000-8000-000000000004'::uuid),
  true,
  'generic predicate ignores is_public; callers add the visibility term (spec 4.2)'
);

select is(
  public.util__is_resource_private_to_owner ('dashboard', 'a2005999-0000-4000-8000-000000000999'::uuid),
  false,
  'nonexistent resource is not private'
);

select is(
  public.util__is_resource_private_to_owner ('dataset', 'a2007001-0000-4000-8000-000000000001'::uuid),
  true,
  'dataset restricted with no shares is private'
);

select is(
  public.util__is_resource_private_to_owner ('dataset', 'a2007002-0000-4000-8000-000000000002'::uuid),
  false,
  'unrestricted dataset is not private'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"a2000002-0000-4000-8000-000000000002"}',
  true
);

select throws_ok(
  $$select public.util__is_resource_private_to_owner (
      'dashboard',
      'a2005001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'permission denied for function util__is_resource_private_to_owner',
  'an authenticated caller cannot execute the metadata-sensitive predicate'
);

select throws_ok(
  $$select public.util__has_non_owner_share (
      'dashboard',
      'a2005001-0000-4000-8000-000000000001'::uuid,
      'a2001001-0000-4000-8000-000000000001'::uuid,
      'a2000001-0000-4000-8000-000000000001'::uuid
    )$$,
  '42501',
  'permission denied for function util__has_non_owner_share',
  'an authenticated caller cannot execute the internal share predicate'
);

select * from finish();

rollback;
