\set ON_ERROR_STOP on

/**
 * The workspace roster is not enumerable through the Data API.
 *
 * Four RLS policies need to answer one question: "is this user a member of
 * this workspace?" They used to answer it with
 * `public.util__get_workspace_members (workspace_id)`, a `security definer`
 * function that took a workspace id, checked nothing about the caller, and
 * returned every member's `auth.users.id`. Postgres grants EXECUTE on a new
 * function to PUBLIC and no schema file revoked it, so PostgREST served it to
 * `anon`: with only the publishable key and a workspace id (which `anon` reads
 * off any public dashboard row) an unauthenticated caller got the whole
 * roster. See docs/audits/2026-08-19-catchup-audit.md, finding F-5.
 *
 * The replacement, `public.util__is_workspace_member`, answers the same
 * question about a user id the caller already holds, so there is nothing left
 * to enumerate. This file pins both halves: the enumerator is gone, and the
 * predicate that replaced it is reachable only by `authenticated` while the
 * membership invariant it backs still holds.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('ca000001-0000-4000-8000-000000000001'::uuid, 'roster_owner@test.dev', 'authenticated', 'authenticated'),
  ('ca000002-0000-4000-8000-000000000002'::uuid, 'roster_member@test.dev', 'authenticated', 'authenticated'),
  ('ca000003-0000-4000-8000-000000000003'::uuid, 'roster_outsider@test.dev', 'authenticated', 'authenticated');

insert into public.workspaces (id, owner_id, name, slug)
values
  ('ca001001-0000-4000-8000-000000000001'::uuid, 'ca000001-0000-4000-8000-000000000001'::uuid, 'roster ws a', 'roster-ws-a'),
  ('ca001002-0000-4000-8000-000000000002'::uuid, 'ca000003-0000-4000-8000-000000000003'::uuid, 'roster ws b', 'roster-ws-b');

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('ca002001-0000-4000-8000-000000000001'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'ca000001-0000-4000-8000-000000000001'::uuid),
  ('ca002002-0000-4000-8000-000000000002'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'ca000002-0000-4000-8000-000000000002'::uuid),
  ('ca002003-0000-4000-8000-000000000003'::uuid, 'ca001002-0000-4000-8000-000000000002'::uuid, 'ca000003-0000-4000-8000-000000000003'::uuid);

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('ca003001-0000-4000-8000-000000000001'::uuid, 'ca000001-0000-4000-8000-000000000001'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'ca002001-0000-4000-8000-000000000001'::uuid, 'CA Owner', 'CA Owner'),
  ('ca003002-0000-4000-8000-000000000002'::uuid, 'ca000002-0000-4000-8000-000000000002'::uuid, 'ca001001-0000-4000-8000-000000000001'::uuid, 'ca002002-0000-4000-8000-000000000002'::uuid, 'CA Member', 'CA Member'),
  ('ca003003-0000-4000-8000-000000000003'::uuid, 'ca000003-0000-4000-8000-000000000003'::uuid, 'ca001002-0000-4000-8000-000000000002'::uuid, 'ca002003-0000-4000-8000-000000000003'::uuid, 'CA Outsider', 'CA Outsider');

insert into public.dashboards (id, workspace_id, owner_id, owner_profile_id, name, config)
values (
  'ca005001-0000-4000-8000-000000000001'::uuid,
  'ca001001-0000-4000-8000-000000000001'::uuid,
  'ca000001-0000-4000-8000-000000000001'::uuid,
  'ca003001-0000-4000-8000-000000000001'::uuid,
  'ca dashboard',
  '{}'::jsonb
);

select plan (9);

-- 1. The table itself was never the leak: `anon` holds no privilege on it.
--    Stated so the two halves of the boundary are pinned in one place.
select throws_ok (
  $t1$
  set local role anon;
  select count(*)::int from public.workspace_memberships;
  $t1$,
  '42501',
  null,
  'anon cannot select workspace_memberships'
);

-- 2. The enumerator is gone. A `uuid[]` of every member, keyed only on a
--    workspace id, is a roster dump whatever its ACL says, so the fix removes
--    the shape rather than trying to grant around it.
select hasnt_function (
  'public',
  'util__get_workspace_members',
  array['uuid'],
  'the roster enumerator util__get_workspace_members no longer exists'
);

-- 3-5. The replacement is reachable by exactly one role. `authenticated` needs
--      it because the four policies that call it are evaluated as the calling
--      role; nothing else does.
select ok (
  has_function_privilege (
    'authenticated',
    'public.util__is_workspace_member(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute util__is_workspace_member'
);

select ok (
  not has_function_privilege (
    'anon',
    'public.util__is_workspace_member(uuid,uuid)',
    'EXECUTE'
  ),
  'anon cannot execute util__is_workspace_member'
);

select ok (
  not has_function_privilege (
    'service_role',
    'public.util__is_workspace_member(uuid,uuid)',
    'EXECUTE'
  ),
  'service_role cannot execute util__is_workspace_member'
);

-- 6-7. The predicate answers the membership question correctly, including for
--      a user who belongs to a different workspace.
select is (
  public.util__is_workspace_member (
    'ca001001-0000-4000-8000-000000000001'::uuid,
    'ca000002-0000-4000-8000-000000000002'::uuid
  ),
  true,
  'a member of the workspace reads as a member'
);

select is (
  public.util__is_workspace_member (
    'ca001001-0000-4000-8000-000000000001'::uuid,
    'ca000003-0000-4000-8000-000000000003'::uuid
  ),
  false,
  'a member of another workspace does not read as a member'
);

-- 8-9. The invariant the policies buy with it: a resource owner may hand the
--      row to a workspace member and to nobody else. This is what would break
--      if the predicate were swapped for one that ignores its user argument.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"ca000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.dashboards
  set owner_id = 'ca000003-0000-4000-8000-000000000003'::uuid
  where id = 'ca005001-0000-4000-8000-000000000001'::uuid;
  $t8$,
  '42501',
  null,
  'a dashboard cannot be handed to a user outside its workspace'
);

select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"ca000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.dashboards
  set
    owner_id = 'ca000002-0000-4000-8000-000000000002'::uuid,
    owner_profile_id = 'ca003002-0000-4000-8000-000000000002'::uuid
  where id = 'ca005001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.dashboards d
      where
        d.id = 'ca005001-0000-4000-8000-000000000001'::uuid and
        d.owner_id = 'ca000002-0000-4000-8000-000000000002'::uuid
    ) <> 1 then
      raise exception 'the dashboard was not handed to the workspace member';
    end if;
  end $chk$;
  $t9$,
  'a dashboard can be handed to a member of its own workspace'
);

select * from finish ();

rollback;
