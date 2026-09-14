\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `individuals`.
 *
 * Locks this table's four policies: a member of one workspace must not read, insert, update, or delete another
 * workspace's rows, and `anon` must not reach the table at all.
 *
 * Read directly the policies look correct, all four gating on
 * `workspace_id = any(array(select util__get_auth_user_workspaces()))`. This
 * file exists so that nothing silently narrows or drops that predicate later.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f3000001-0000-4000-8000-000000000001'::uuid, 'individuals_insider@test.dev', 'authenticated', 'authenticated'),
  ('f3000002-0000-4000-8000-000000000002'::uuid, 'individuals_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'individuals ws a', 'individuals-ws-a'),
  ('f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid, 'individuals ws b', 'individuals-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('f3002001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid),
  ('f3002002-0000-4000-8000-000000000002'::uuid, 'f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f300b003-0000-4000-8000-000000000003'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.individuals (
  id, workspace_id, name, concept_id, external_id, status
)
values (
  'f300a001-0000-4000-8000-000000000001'::uuid,
  'f3001001-0000-4000-8000-000000000001'::uuid,
  'ws a individual',
  'f300b003-0000-4000-8000-000000000003'::uuid,
  'ext-1',
  'active'
)
on conflict (id) do nothing;

select plan (6);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own individuals row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the individuals row'
);

-- 2. A member of another workspace reads nothing. This is the cross-tenant
-- boundary: the whole point of the file.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.workspace_id = 'f3001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read individuals rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no individuals rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id, status)
  values ('f300b001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'smuggled individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-2', 'active');
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a individuals row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
-- Checked as the superuser after resetting the role.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'outsider tried update'
  where id = 'f300a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a001-0000-4000-8000-000000000001'::uuid and t.name = 'ws a individual'
    ) <> 1 then
      raise exception 'an outsider updated a individuals row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a individuals row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a individuals row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a individuals row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.individuals;
  $t6$,
  '42501',
  null,
  'anon cannot select individuals'
);

select * from finish ();

rollback;
