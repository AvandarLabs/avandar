\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- This test simulates the resource_user_group_tags -> resource_shares
-- backfill. It seeds a representative pre-migration state, captures effective
-- roles, runs the backfill body inline, then asserts post-migration
-- effective roles. Any diff beyond the documented role-translation caveat
-- (per-user app role -> fixed share role of 'editor') must fail.
--
-- The test runs inside a transaction; the table drop is NOT exercised here
-- (that's pure DDL covered by Postgres). What matters is that the truth
-- table of util__resource_effective_role does not regress for users that
-- were previously granted access via the tag-intersection branch.

-- ---------------------------------------------------------------------------
-- Seed: one workspace, one user_group ('Analytics'), one tagged dataset, two
-- members. alice has data_sources app role (viewer); bob has none.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role) values
  (
    '91000001-0000-4000-8000-000000000001'::uuid,
    'mig_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '91000002-0000-4000-8000-000000000002'::uuid,
    'mig_alice@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    '91000003-0000-4000-8000-000000000003'::uuid,
    'mig_bob@test.dev',
    'authenticated',
    'authenticated'
  );

insert into public.workspaces (id, owner_id, name, slug) values (
  '91001001-0000-4000-8000-000000000001'::uuid,
  '91000001-0000-4000-8000-000000000001'::uuid,
  'migration diff workspace',
  'mig-diff-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id) values
  (
    '91002001-0000-4000-8000-000000000001'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    '91002002-0000-4000-8000-000000000002'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    '91002003-0000-4000-8000-000000000003'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91000003-0000-4000-8000-000000000003'::uuid
  );

-- alice: data_sources viewer; bob: no data_sources entry. Both at Global
-- Viewer level for non-data-sources apps. The seed-workspace trigger has
-- already installed builtin role_groups; we craft custom ones to drive the
-- truth table cleanly.
insert into public.role_groups (id, workspace_id, name, is_builtin) values
  (
    '91003001-0000-4000-8000-000000000001'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    'mig_alice_role_group',
    false
  ),
  (
    '91003002-0000-4000-8000-000000000002'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    'mig_bob_role_group',
    false
  );

insert into public.role_group_app_roles (role_group_id, app, role) values
  (
    '91003001-0000-4000-8000-000000000001'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003001-0000-4000-8000-000000000001'::uuid,
    'data_sources'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003001-0000-4000-8000-000000000001'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003001-0000-4000-8000-000000000001'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003002-0000-4000-8000-000000000002'::uuid,
    'settings'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003002-0000-4000-8000-000000000002'::uuid,
    'dashboards'::public.app_type,
    'viewer'::public.role_level
  ),
  (
    '91003002-0000-4000-8000-000000000002'::uuid,
    'data_explorer'::public.app_type,
    'viewer'::public.role_level
  );

update public.workspace_memberships
set role_group_id = '91003001-0000-4000-8000-000000000001'::uuid
where id = '91002002-0000-4000-8000-000000000002'::uuid;

update public.workspace_memberships
set role_group_id = '91003002-0000-4000-8000-000000000002'::uuid
where id = '91002003-0000-4000-8000-000000000003'::uuid;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
) values
  (
    '91004001-0000-4000-8000-000000000001'::uuid,
    '91000001-0000-4000-8000-000000000001'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91002001-0000-4000-8000-000000000001'::uuid,
    'Owner', 'Owner'
  ),
  (
    '91004002-0000-4000-8000-000000000002'::uuid,
    '91000002-0000-4000-8000-000000000002'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91002002-0000-4000-8000-000000000002'::uuid,
    'Alice', 'Alice'
  ),
  (
    '91004003-0000-4000-8000-000000000003'::uuid,
    '91000003-0000-4000-8000-000000000003'::uuid,
    '91001001-0000-4000-8000-000000000001'::uuid,
    '91002003-0000-4000-8000-000000000003'::uuid,
    'Bob', 'Bob'
  );

insert into public.user_groups (id, workspace_id, name, color) values (
  '91005001-0000-4000-8000-000000000001'::uuid,
  '91001001-0000-4000-8000-000000000001'::uuid,
  'Analytics',
  '#00ff00'
);

insert into public.user_group_memberships (user_group_id, user_id) values
  (
    '91005001-0000-4000-8000-000000000001'::uuid,
    '91000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    '91005001-0000-4000-8000-000000000001'::uuid,
    '91000003-0000-4000-8000-000000000003'::uuid
  );

-- Dataset: unrestricted, owned by owner, tagged with Analytics. With tags
-- present, pre-migration alice (data_sources viewer + in Analytics) gets
-- viewer via the intersection path; bob (no data_sources + in Analytics) gets
-- nothing because the app-role candidate is null even though intersection
-- exists.
insert into public.datasets (
  id, owner_id, owner_profile_id, workspace_id, name, description,
  source_type, is_restricted
) values (
  '91006001-0000-4000-8000-000000000001'::uuid,
  '91000001-0000-4000-8000-000000000001'::uuid,
  '91004001-0000-4000-8000-000000000001'::uuid,
  '91001001-0000-4000-8000-000000000001'::uuid,
  'Tagged dataset',
  '',
  'csv_file'::public.datasets__source_type,
  false
);

insert into public.resource_user_group_tags (
  workspace_id, resource_type, resource_id, user_group_id
) values (
  '91001001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  '91006001-0000-4000-8000-000000000001'::uuid,
  '91005001-0000-4000-8000-000000000001'::uuid
);

-- ---------------------------------------------------------------------------
-- Snapshot pre-migration effective roles
-- ---------------------------------------------------------------------------

create temporary table mig_diff_snapshot (
  phase text not null,
  actor_label text not null,
  resource_id uuid not null,
  effective_role public.role_level
);

-- The snapshot captures rows while running as the authenticated role; grant
-- it so the `set local role authenticated` blocks below can insert.
grant insert, select on mig_diff_snapshot to authenticated;

-- Capture as alice
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000002-0000-4000-8000-000000000002"}',
  true
);
insert into mig_diff_snapshot (phase, actor_label, resource_id, effective_role)
values (
  'pre',
  'alice',
  '91006001-0000-4000-8000-000000000001'::uuid,
  public.util__resource_effective_role (
    'dataset'::public.resource_type,
    '91006001-0000-4000-8000-000000000001'::uuid
  )
);

-- Capture as bob
select set_config(
  'request.jwt.claims',
  '{"sub":"91000003-0000-4000-8000-000000000003"}',
  true
);
insert into mig_diff_snapshot (phase, actor_label, resource_id, effective_role)
values (
  'pre',
  'bob',
  '91006001-0000-4000-8000-000000000001'::uuid,
  public.util__resource_effective_role (
    'dataset'::public.resource_type,
    '91006001-0000-4000-8000-000000000001'::uuid
  )
);

-- ---------------------------------------------------------------------------
-- Run the backfill inline (mirror of
-- supabase/migrations/20260518000000_backfill_resource_tags_into_shares.sql).
-- ---------------------------------------------------------------------------
set local role postgres;

insert into public.resource_shares (
  workspace_id, resource_type, resource_id,
  principal_type, principal_id, role, requires_app_access
)
select
  rugt.workspace_id,
  rugt.resource_type,
  rugt.resource_id,
  'user_group'::public.share_principal_type,
  rugt.user_group_id,
  'editor'::public.role_level,
  true
from public.resource_user_group_tags rugt
on conflict (resource_type, resource_id, principal_type, principal_id)
where principal_type = 'user_group'::public.share_principal_type
do nothing;

update public.resource_shares rs
set
  requires_app_access = true,
  updated_at = now()
from public.resource_user_group_tags rugt
where
  rs.workspace_id = rugt.workspace_id and
  rs.resource_type = rugt.resource_type and
  rs.resource_id = rugt.resource_id and
  rs.principal_type = 'user_group'::public.share_principal_type and
  rs.principal_id = rugt.user_group_id and
  rs.requires_app_access = false;

-- ---------------------------------------------------------------------------
-- Snapshot post-migration effective roles
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000002-0000-4000-8000-000000000002"}',
  true
);
insert into mig_diff_snapshot (phase, actor_label, resource_id, effective_role)
values (
  'post',
  'alice',
  '91006001-0000-4000-8000-000000000001'::uuid,
  public.util__resource_effective_role (
    'dataset'::public.resource_type,
    '91006001-0000-4000-8000-000000000001'::uuid
  )
);

select set_config(
  'request.jwt.claims',
  '{"sub":"91000003-0000-4000-8000-000000000003"}',
  true
);
insert into mig_diff_snapshot (phase, actor_label, resource_id, effective_role)
values (
  'post',
  'bob',
  '91006001-0000-4000-8000-000000000001'::uuid,
  public.util__resource_effective_role (
    'dataset'::public.resource_type,
    '91006001-0000-4000-8000-000000000001'::uuid
  )
);

-- ---------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------
set local role postgres;

select plan(6);

-- Pre-migration: alice (data_sources viewer + in Analytics) had viewer via
-- the tag-intersection branch.
select is(
  (
    select effective_role
    from mig_diff_snapshot
    where phase = 'pre' and actor_label = 'alice'
  )::text,
  'viewer'::text,
  'pre-migration: alice gets viewer via tag intersection (own data_sources app role)'
);

-- Pre-migration: bob (no data_sources + in Analytics) had nothing — the
-- intersection branch needs a non-null app role.
select is(
  (
    select effective_role
    from mig_diff_snapshot
    where phase = 'pre' and actor_label = 'bob'
  ),
  null::public.role_level,
  'pre-migration: bob has no data_sources role, no grant'
);

-- Post-migration: alice still has access; her role is EDITOR (not viewer).
-- This is the documented role-translation caveat: the backfill stores a
-- fixed share role of 'editor' for the converted tag row, which lifts
-- alice's effective role above what she had pre-migration. Asserting the
-- new role here pins the caveat and protects against an accidental swap
-- to viewer (which would fail this assertion and require an explicit plan
-- update).
select is(
  (
    select effective_role
    from mig_diff_snapshot
    where phase = 'post' and actor_label = 'alice'
  )::text,
  'editor'::text,
  'post-migration: alice is editor (role-translation caveat: per-user role -> fixed share role)'
);

-- Post-migration: bob still gets nothing because requires_app_access=true
-- gates the new share on having any data_sources app role; bob has none.
-- This preserves the legacy behavior for tag rows where the user had no app
-- role on the resource's app.
select is(
  (
    select effective_role
    from mig_diff_snapshot
    where phase = 'post' and actor_label = 'bob'
  ),
  null::public.role_level,
  'post-migration: bob still excluded (requires_app_access gates on app role)'
);

-- The backfill must have inserted exactly one new share row for the tag.
select is(
  (
    select count(*)
    from public.resource_shares
    where
      workspace_id = '91001001-0000-4000-8000-000000000001'::uuid and
      resource_type = 'dataset'::public.resource_type and
      resource_id = '91006001-0000-4000-8000-000000000001'::uuid and
      principal_type = 'user_group'::public.share_principal_type and
      principal_id = '91005001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'backfill inserts exactly one user_group share per tag row'
);

-- The inserted share has requires_app_access=true and role=editor.
select is(
  (
    select rs.role::text || '|' || rs.requires_app_access::text
    from public.resource_shares rs
    where
      rs.workspace_id = '91001001-0000-4000-8000-000000000001'::uuid and
      rs.resource_type = 'dataset'::public.resource_type and
      rs.resource_id = '91006001-0000-4000-8000-000000000001'::uuid and
      rs.principal_type = 'user_group'::public.share_principal_type and
      rs.principal_id = '91005001-0000-4000-8000-000000000001'::uuid
  ),
  'editor|true',
  'backfill row has role=editor and requires_app_access=true'
);

select * from finish();

rollback;
