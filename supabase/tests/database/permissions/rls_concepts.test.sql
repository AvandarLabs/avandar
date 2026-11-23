\set ON_ERROR_STOP on

/**
 * RLS for `concepts`.
 *
 * Every workspace member reads the table, whatever their case roles, so the
 * Data Explorer and chat can query case types. Creating and editing a case
 * type requires `case_types` editor, and deleting one requires `case_types`
 * admin. A member of another workspace can do none of it, and `anon` cannot
 * reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f1000001-0000-4000-8000-000000000001'::uuid, 'concepts_insider@test.dev', 'authenticated', 'authenticated'),
  ('f1000002-0000-4000-8000-000000000002'::uuid, 'concepts_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f1000003-0000-4000-8000-000000000003'::uuid, 'concepts_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f1000004-0000-4000-8000-000000000004'::uuid, 'concepts_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f1000005-0000-4000-8000-000000000005'::uuid, 'concepts_types_admin@test.dev', 'authenticated', 'authenticated'),
  ('f1000006-0000-4000-8000-000000000006'::uuid, 'concepts_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'concepts ws a', 'concepts-ws-a'),
  ('f1001002-0000-4000-8000-000000000002'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, 'concepts ws b', 'concepts-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f1004003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types viewer', false),
  ('f1004004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types editor', false),
  ('f1004005-0000-4000-8000-000000000005'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts types admin', false),
  ('f1004006-0000-4000-8000-000000000006'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'concepts no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f1004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f1004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f1004005-0000-4000-8000-000000000005'::uuid, 'case_types'::public.app_type, 'admin'::public.role_level),
  ('f1004006-0000-4000-8000-000000000006'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f1002001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, null),
  ('f1002002-0000-4000-8000-000000000002'::uuid, 'f1001002-0000-4000-8000-000000000002'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, null),
  ('f1002003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000003-0000-4000-8000-000000000003'::uuid, 'f1004003-0000-4000-8000-000000000003'::uuid),
  ('f1002004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000004-0000-4000-8000-000000000004'::uuid, 'f1004004-0000-4000-8000-000000000004'::uuid),
  ('f1002005-0000-4000-8000-000000000005'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000005-0000-4000-8000-000000000005'::uuid, 'f1004005-0000-4000-8000-000000000005'::uuid),
  ('f1002006-0000-4000-8000-000000000006'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f1000006-0000-4000-8000-000000000006'::uuid, 'f1004006-0000-4000-8000-000000000006'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('f100a001-0000-4000-8000-000000000001'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'ws a concept', false, 'f100c001-0000-4000-8000-000000000001'::uuid),
  ('f100a002-0000-4000-8000-000000000002'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'disposable concept', false, 'f100c002-0000-4000-8000-000000000002'::uuid),
  ('f100a003-0000-4000-8000-000000000003'::uuid, 'f1000001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'editable concept', false, 'f100c003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('f100c001-0000-4000-8000-000000000001'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f100a001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('f100c002-0000-4000-8000-000000000002'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f100a002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0),
  ('f100c003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f100a003-0000-4000-8000-000000000003'::uuid, 'Active', '#40c057', 0)
on conflict (id) do nothing;

select plan (14);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own concepts row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the concepts row'
);

-- 2. A member of another workspace reads nothing. This is the cross-tenant
-- boundary: the whole point of the file.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.workspace_id = 'f1001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read concepts rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no concepts rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
  values ('f100b001-0000-4000-8000-000000000001'::uuid, 'f1000002-0000-4000-8000-000000000002'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'smuggled concept', false, 'f100c011-0000-4000-8000-000000000011'::uuid);
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a concepts row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
-- Checked as the superuser after resetting the role.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.concepts
  set name = 'outsider tried update'
  where id = 'f100a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a001-0000-4000-8000-000000000001'::uuid and t.name = 'ws a concept'
    ) <> 1 then
      raise exception 'an outsider updated a concepts row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a concepts row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.concepts where id = 'f100a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a concepts row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a concepts row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.concepts;
  $t6$,
  '42501',
  null,
  'anon cannot select concepts'
);

-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000006-0000-4000-8000-000000000006","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a concepts row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the concepts row'
);

-- 8. A case_types viewer cannot create a case type.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
  values ('f100b002-0000-4000-8000-000000000002'::uuid, 'f1000003-0000-4000-8000-000000000003'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'viewer concept', false, 'f100c012-0000-4000-8000-000000000012'::uuid);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a concepts row'
);

-- 9. A case_types editor creates a case type.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
  values ('f100b003-0000-4000-8000-000000000003'::uuid, 'f1000004-0000-4000-8000-000000000004'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'editor concept', false, 'f100c013-0000-4000-8000-000000000013'::uuid);
  insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
  values ('f100c013-0000-4000-8000-000000000013'::uuid, 'f1001001-0000-4000-8000-000000000001'::uuid, 'f100b003-0000-4000-8000-000000000003'::uuid, 'Active', '#40c057', 0);
  reset role;
  $t9$,
  'a case_types editor inserts a concepts row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.concepts
  set name = 'viewer tried update'
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a003-0000-4000-8000-000000000003'::uuid and t.name = 'editable concept'
    ) <> 1 then
      raise exception 'a case_types viewer updated a concepts row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a concepts row'
);

-- 11. A case_types editor edits a case type.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concepts
  set name = 'renamed by editor'
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a003-0000-4000-8000-000000000003'::uuid and t.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'a case_types editor could not update a concepts row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a concepts row'
);

-- 12. The WITH CHECK clause stops an editor moving a case type into a
-- workspace where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concepts
  set workspace_id = 'f1001002-0000-4000-8000-000000000002'::uuid
  where id = 'f100a003-0000-4000-8000-000000000003'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a concepts row into another workspace'
);

-- 13. Deleting a case type needs admin, so an editor's DELETE is filtered and
-- the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.concepts where id = 'f100a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a002-0000-4000-8000-000000000002'::uuid
    ) <> 1 then
      raise exception 'a case_types editor deleted a concepts row';
    end if;
  end $chk$;
  $t13$,
  'a case_types editor cannot delete a concepts row'
);

-- 14. A case_types admin deletes a case type.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f1000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  delete from public.concepts where id = 'f100a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concepts t
      where t.id = 'f100a002-0000-4000-8000-000000000002'::uuid
    ) <> 0 then
      raise exception 'a case_types admin could not delete a concepts row';
    end if;
  end $chk$;
  $t14$,
  'a case_types admin deletes a concepts row'
);

select * from finish ();

rollback;
