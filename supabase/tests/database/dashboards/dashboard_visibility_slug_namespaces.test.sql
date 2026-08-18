\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- Vanity slugs use the namespace of the URL that serves them:
--
--   visibility = 'public'    -> /d/<slug>, globally unique
--   visibility = 'workspace' -> /<workspaceSlug>/d/<slug>, unique per workspace
--
-- Draft rows are unconstrained because they do not have a published URL.
--
insert into auth.users (id, email, aud, role)
values
  ('d1000001-0000-4000-8000-000000000001'::uuid, 'd1_owner@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'd1001001-0000-4000-8000-000000000001'::uuid,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    'd1 workspace a',
    'd1-visibility-ws-a'
  ),
  (
    'd1001002-0000-4000-8000-000000000002'::uuid,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    'd1 workspace b',
    'd1-visibility-ws-b'
  );

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('d1002001-0000-4000-8000-000000000001'::uuid, 'd1001001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, null),
  ('d1002002-0000-4000-8000-000000000002'::uuid, 'd1001002-0000-4000-8000-000000000002'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, null);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d1003001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1001001-0000-4000-8000-000000000001'::uuid, 'd1002001-0000-4000-8000-000000000001'::uuid, 'D1 Owner A', 'D1 Owner A'),
  ('d1003002-0000-4000-8000-000000000002'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1001002-0000-4000-8000-000000000002'::uuid, 'd1002002-0000-4000-8000-000000000002'::uuid, 'D1 Owner B', 'D1 Owner B');

select plan(8);

-- Helper: inserts a dashboard with an explicit visibility and slug.
create or replace function pg_temp.dashboards__d1_insert (
  p_id uuid,
  p_workspace_id uuid,
  p_profile_id uuid,
  p_visibility public.dashboard_visibility,
  p_slug text
) returns void language sql as $$
  insert into public.dashboards (
    id, workspace_id, owner_id, owner_profile_id, name, config, visibility,
    slug, snapshot_revision
  )
  values (
    p_id,
    p_workspace_id,
    'd1000001-0000-4000-8000-000000000001'::uuid,
    p_profile_id,
    'd1 dashboard',
    '{}'::jsonb,
    p_visibility,
    p_slug,
    case when p_visibility = 'draft' then null else p_id end
  );
$$;

-- The generated column ------------------------------------------------------

select lives_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004001-0000-4000-8000-000000000001'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'public'::public.dashboard_visibility,
      'd1-shared-slug'
    )$$,
  'a public dashboard with a slug inserts'
);

select is(
  (select is_public from public.dashboards where id = 'd1004001-0000-4000-8000-000000000001'::uuid),
  true,
  'is_public is derived as true for visibility = public'
);

select throws_ok(
  $$update public.dashboards
       set is_public = false
     where id = 'd1004001-0000-4000-8000-000000000001'::uuid$$,
  '428C9',
  null,
  'is_public cannot be written directly; it is generated'
);

-- The public namespace is global -------------------------------------------

select throws_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004002-0000-4000-8000-000000000002'::uuid,
      'd1001002-0000-4000-8000-000000000002'::uuid,
      'd1003002-0000-4000-8000-000000000002'::uuid,
      'public'::public.dashboard_visibility,
      'd1-shared-slug'
    )$$,
  '23505',
  null,
  'a second public dashboard cannot take the same slug, even in another workspace'
);

-- The workspace namespace is per workspace ---------------------------------

select lives_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004003-0000-4000-8000-000000000003'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'a workspace dashboard can take a slug'
);

select lives_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004004-0000-4000-8000-000000000004'::uuid,
      'd1001002-0000-4000-8000-000000000002'::uuid,
      'd1003002-0000-4000-8000-000000000002'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'another workspace can take the same internal slug'
);

select throws_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004005-0000-4000-8000-000000000005'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'workspace'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  '23505',
  null,
  'the same workspace cannot reuse an internal slug'
);

-- Drafts are unconstrained -------------------------------------------------

select lives_ok(
  $$select pg_temp.dashboards__d1_insert(
      'd1004006-0000-4000-8000-000000000006'::uuid,
      'd1001001-0000-4000-8000-000000000001'::uuid,
      'd1003001-0000-4000-8000-000000000001'::uuid,
      'draft'::public.dashboard_visibility,
      'd1-internal-slug'
    )$$,
  'a draft may reuse a slug already held by a published dashboard'
);

select * from finish();

rollback;
