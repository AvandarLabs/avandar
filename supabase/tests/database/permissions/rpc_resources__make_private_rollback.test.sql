\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- rpc_resources__make_private ends with a post-condition: after deleting every
-- non-owner share it re-reads resource_shares and raises make_private_incomplete
-- if one survived. The function is SECURITY INVOKER, so its DELETE is
-- RLS-filtered, and a policy that silently drops a row from the DELETE's scope
-- would otherwise leave the function reporting success on a still-shared
-- resource. This file asserts that when the post-condition fires it is a real
-- rollback: both the DELETE and the is_restricted UPDATE are undone.
--
-- Fixtures. Prefix b2 keeps these distinct within this file.
insert into auth.users (id, email, aud, role)
values
  ('b2000001-0000-4000-8000-000000000001'::uuid, 'b2_owner@test.dev', 'authenticated', 'authenticated'),
  ('b2000002-0000-4000-8000-000000000002'::uuid, 'b2_other@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'b2 workspace',
  'b2-make-private-rollback-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('b2002001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid),
  ('b2002002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('b2003001-0000-4000-8000-000000000001'::uuid, 'b2000001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002001-0000-4000-8000-000000000001'::uuid, 'B2 Owner', 'B2 Owner'),
  ('b2003002-0000-4000-8000-000000000002'::uuid, 'b2000002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2002002-0000-4000-8000-000000000002'::uuid, 'B2 Other', 'B2 Other');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config, is_restricted)
values (
  'b2005001-0000-4000-8000-000000000001'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'b2003001-0000-4000-8000-000000000001'::uuid,
  'b2 shared dashboard',
  '{}'::jsonb,
  false
);

insert into public.user_groups (id, workspace_id, name, color)
values ('b2004001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'b2 group', '#000000');

-- Two non-owner shares, because the two rollback assertions need different
-- things from them. The user share is the one the restrictive policy below
-- hides from the DELETE, so it is what makes the post-condition fire. The group
-- share is deletable, so it is the row whose deletion has to be undone: if the
-- statement did not roll back, it would be gone.
insert into public.resource_shares (id, workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('b2006001-0000-4000-8000-000000000001'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b2005001-0000-4000-8000-000000000001'::uuid, 'user', 'b2000002-0000-4000-8000-000000000002'::uuid, 'viewer'),
  ('b2006002-0000-4000-8000-000000000002'::uuid, 'b2001001-0000-4000-8000-000000000001'::uuid, 'dashboard', 'b2005001-0000-4000-8000-000000000001'::uuid, 'user_group', 'b2004001-0000-4000-8000-000000000001'::uuid, 'viewer');

-- Reproduce the failure mode the post-condition guards against, rather than
-- stubbing the predicate: a restrictive DELETE policy is ANDed with the
-- permissive ones, so this one silently removes the user share from the scope
-- of the owner's DELETE without raising anything, while leaving the group share
-- deletable. The SELECT policy is untouched, so the post-condition still sees
-- the surviving user share and fires. DDL is transactional, so this policy dies
-- with the test's rollback.
create policy "b2 hide one share from deletes" on public.resource_shares as restrictive for delete to authenticated using (
  public.resource_shares.id <> 'b2006001-0000-4000-8000-000000000001'::uuid
);

select plan(3);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000001-0000-4000-8000-000000000001"}', true);

select throws_ok(
  $$select public.rpc_resources__make_private (
      'dashboard', 'b2005001-0000-4000-8000-000000000001'::uuid
    )$$,
  'make_private_incomplete',
  'a share that survives the RLS-filtered delete raises make_private_incomplete'
);

-- throws_ok catches the exception inside a plpgsql block, which rolls back to
-- that block's implicit savepoint. So these two assertions read the state the
-- failed call left behind.
set local role postgres;

select is(
  (select count(*)::int from public.resource_shares
    where resource_id = 'b2005001-0000-4000-8000-000000000001'::uuid),
  2,
  'the delete rolled back: the group share it did remove is back'
);

select is(
  (select is_restricted from public.dashboards
    where id = 'b2005001-0000-4000-8000-000000000001'::uuid),
  false,
  'the update rolled back: is_restricted is still false'
);

select * from finish();

rollback;
