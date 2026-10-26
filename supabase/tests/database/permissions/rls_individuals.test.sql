\set ON_ERROR_STOP on

/**
 * RLS for `individuals`.
 *
 * Every workspace member reads the table, whatever their case roles. A
 * refresh writes records as a `case_types` editor and the people working the
 * records write them as a `case_records` editor, so either role may insert
 * and update a record. Deleting one requires `case_records` admin. A member
 * of another workspace can do none of it, and `anon` cannot reach the table
 * at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one role.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f3000001-0000-4000-8000-000000000001'::uuid, 'individuals_insider@test.dev', 'authenticated', 'authenticated'),
  ('f3000002-0000-4000-8000-000000000002'::uuid, 'individuals_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f3000003-0000-4000-8000-000000000003'::uuid, 'individuals_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f3000004-0000-4000-8000-000000000004'::uuid, 'individuals_records_editor@test.dev', 'authenticated', 'authenticated'),
  ('f3000005-0000-4000-8000-000000000005'::uuid, 'individuals_records_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f3000006-0000-4000-8000-000000000006'::uuid, 'individuals_records_admin@test.dev', 'authenticated', 'authenticated'),
  ('f3000007-0000-4000-8000-000000000007'::uuid, 'individuals_types_admin@test.dev', 'authenticated', 'authenticated'),
  ('f3000008-0000-4000-8000-000000000008'::uuid, 'individuals_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'individuals ws a', 'individuals-ws-a'),
  ('f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid, 'individuals ws b', 'individuals-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f3004003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals types editor', false),
  ('f3004004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records editor', false),
  ('f3004005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records viewer', false),
  ('f3004006-0000-4000-8000-000000000006'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals records admin', false),
  ('f3004007-0000-4000-8000-000000000007'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals types admin', false),
  ('f3004008-0000-4000-8000-000000000008'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'individuals no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f3004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f3004004-0000-4000-8000-000000000004'::uuid, 'case_records'::public.app_type, 'editor'::public.role_level),
  ('f3004005-0000-4000-8000-000000000005'::uuid, 'case_records'::public.app_type, 'viewer'::public.role_level),
  ('f3004006-0000-4000-8000-000000000006'::uuid, 'case_records'::public.app_type, 'admin'::public.role_level),
  ('f3004007-0000-4000-8000-000000000007'::uuid, 'case_types'::public.app_type, 'admin'::public.role_level),
  ('f3004008-0000-4000-8000-000000000008'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f3002001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, null),
  ('f3002002-0000-4000-8000-000000000002'::uuid, 'f3001002-0000-4000-8000-000000000002'::uuid, 'f3000002-0000-4000-8000-000000000002'::uuid, null),
  ('f3002003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000003-0000-4000-8000-000000000003'::uuid, 'f3004003-0000-4000-8000-000000000003'::uuid),
  ('f3002004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000004-0000-4000-8000-000000000004'::uuid, 'f3004004-0000-4000-8000-000000000004'::uuid),
  ('f3002005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000005-0000-4000-8000-000000000005'::uuid, 'f3004005-0000-4000-8000-000000000005'::uuid),
  ('f3002006-0000-4000-8000-000000000006'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000006-0000-4000-8000-000000000006'::uuid, 'f3004006-0000-4000-8000-000000000006'::uuid),
  ('f3002007-0000-4000-8000-000000000007'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000007-0000-4000-8000-000000000007'::uuid, 'f3004007-0000-4000-8000-000000000007'::uuid),
  ('f3002008-0000-4000-8000-000000000008'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'f3000008-0000-4000-8000-000000000008'::uuid, 'f3004008-0000-4000-8000-000000000008'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f300b003-0000-4000-8000-000000000003'::uuid, 'f3000001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.individuals (id, workspace_id, name, concept_id, external_id)
values
  ('f300a001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'ws a individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-1'),
  ('f300a002-0000-4000-8000-000000000002'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'editable individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-2'),
  ('f300a003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'disposable individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-3'),
  ('f300a004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'synced individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-4')
on conflict (id) do nothing;

select plan (18);

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
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300b001-0000-4000-8000-000000000001'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'smuggled individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-smuggled');
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

-- 7. Reads stay open to every member: one with no case role still reads the
-- row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000008-0000-4000-8000-000000000008","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case role cannot read a individuals row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case role still selects the individuals row'
);

-- 8. A case_records viewer cannot add a record.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c005-0000-4000-8000-000000000005'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'viewer individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c5');
  $t8$,
  '42501',
  null,
  'a case_records viewer cannot insert a individuals row'
);

-- 9. A case_types editor with no case_records role adds a record, as a
-- refresh does.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c003-0000-4000-8000-000000000003'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'refresh individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c3');
  reset role;
  $t9$,
  'a case_types editor with no case_records role inserts a individuals row'
);

-- 10. A case_records editor with no case_types role adds a record.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.individuals (id, workspace_id, name, concept_id, external_id)
  values ('f300c004-0000-4000-8000-000000000004'::uuid, 'f3001001-0000-4000-8000-000000000001'::uuid, 'records editor individual', 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-c4');
  reset role;
  $t10$,
  'a case_records editor with no case_types role inserts a individuals row'
);

-- 11. The USING clause filters a case_records viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'viewer tried update'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'editable individual'
    ) <> 1 then
      raise exception 'a case_records viewer updated a individuals row';
    end if;
  end $chk$;
  $t11$,
  'a case_records viewer cannot update a individuals row'
);

-- 12. A case_types editor with no case_records role updates a record.
select lives_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'renamed by refresh'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by refresh'
    ) <> 1 then
      raise exception 'a case_types editor could not update a individuals row';
    end if;
  end $chk$;
  $t12$,
  'a case_types editor with no case_records role updates a individuals row'
);

-- 13. A case_records editor with no case_types role updates a record.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.individuals
  set name = 'renamed by records editor'
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by records editor'
    ) <> 1 then
      raise exception 'a case_records editor could not update a individuals row';
    end if;
  end $chk$;
  $t13$,
  'a case_records editor with no case_types role updates a individuals row'
);

-- 14. The WITH CHECK clause stops an editor moving a record into a workspace
-- where they hold no role.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.individuals
  set workspace_id = 'f3001002-0000-4000-8000-000000000002'::uuid
  where id = 'f300a002-0000-4000-8000-000000000002'::uuid;
  $t14$,
  '42501',
  null,
  'a case_records editor cannot move a individuals row into another workspace'
);

-- 15. A refresh's upsert, the exact shape `generateIndividuals` sends, works
-- for a case_types editor with no case_records role.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
  values ('f3001001-0000-4000-8000-000000000001'::uuid, 'f300b003-0000-4000-8000-000000000003'::uuid, 'ext-4', 'synced by refresh', null)
  on conflict (concept_id, external_id) do update set
    name = excluded.name,
    missing_from_source_at = excluded.missing_from_source_at;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a004-0000-4000-8000-000000000004'::uuid and t.name = 'synced by refresh'
    ) <> 1 then
      raise exception 'a case_types editor refresh upsert did not update a individuals row';
    end if;
  end $chk$;
  $t15$,
  'a case_types editor refresh upserts a individuals row'
);

-- 16. Deleting a record needs case_records admin, so a case_records editor's
-- DELETE is filtered and the row survives.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_records editor deleted a individuals row';
    end if;
  end $chk$;
  $t16$,
  'a case_records editor cannot delete a individuals row'
);

-- 17. A case_types admin holds no case_records role, so their DELETE is
-- filtered too.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000007-0000-4000-8000-000000000007","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types admin deleted a individuals row';
    end if;
  end $chk$;
  $t17$,
  'a case_types admin cannot delete a individuals row'
);

-- 18. A case_records admin deletes a record.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f3000006-0000-4000-8000-000000000006","role":"authenticated"}',
    true
  );
  delete from public.individuals where id = 'f300a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.individuals t
      where t.id = 'f300a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_records admin could not delete a individuals row';
    end if;
  end $chk$;
  $t18$,
  'a case_records admin deletes a individuals row'
);

select * from finish ();

rollback;
