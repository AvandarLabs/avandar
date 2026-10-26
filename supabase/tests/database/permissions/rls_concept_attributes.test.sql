\set ON_ERROR_STOP on

/**
 * RLS for `concept_attributes`.
 *
 * Every workspace member reads the table, whatever their case roles. Writing
 * an attribute is case type design, so INSERT, UPDATE, and DELETE require
 * `case_types` editor. A member of another workspace can do none of it, and
 * `anon` cannot reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 *
 * The label/identifier trigger requires exactly one `is_label` attribute per
 * concept, so every attribute here except the first is deliberately not a
 * label.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs_insider@test.dev', 'authenticated', 'authenticated'),
  ('f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f2000003-0000-4000-8000-000000000003'::uuid, 'conceptattrs_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f2000004-0000-4000-8000-000000000004'::uuid, 'conceptattrs_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f2000005-0000-4000-8000-000000000005'::uuid, 'conceptattrs_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs ws a', 'conceptattrs-ws-a'),
  ('f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs ws b', 'conceptattrs-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f2004003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs types viewer', false),
  ('f2004004-0000-4000-8000-000000000004'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs types editor', false),
  ('f2004005-0000-4000-8000-000000000005'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'conceptattrs no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f2004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f2004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f2004005-0000-4000-8000-000000000005'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f2002001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, null),
  ('f2002002-0000-4000-8000-000000000002'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, null),
  ('f2002003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000003-0000-4000-8000-000000000003'::uuid, 'f2004003-0000-4000-8000-000000000003'::uuid),
  ('f2002004-0000-4000-8000-000000000004'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000004-0000-4000-8000-000000000004'::uuid, 'f2004004-0000-4000-8000-000000000004'::uuid),
  ('f2002005-0000-4000-8000-000000000005'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000005-0000-4000-8000-000000000005'::uuid, 'f2004005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f200b003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('f200a001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'ws a attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, true, false, false, true),
  ('f200a002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'editable attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f200a003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'disposable attribute',
   'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

select plan (14);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own concept_attributes row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the concept_attributes row'
);

-- 2. A member of another workspace reads nothing. This is the cross-tenant
-- boundary: the whole point of the file.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.workspace_id = 'f2001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read concept_attributes rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no concept_attributes rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit)
  values ('f200b001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'smuggled attribute', 'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true);
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a concept_attributes row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
-- Checked as the superuser after resetting the role.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set name = 'outsider tried update'
  where id = 'f200a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a001-0000-4000-8000-000000000001'::uuid and t.name = 'ws a attribute'
    ) <> 1 then
      raise exception 'an outsider updated a concept_attributes row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a concept_attributes row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.concept_attributes where id = 'f200a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a concept_attributes row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a concept_attributes row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.concept_attributes;
  $t6$,
  '42501',
  null,
  'anon cannot select concept_attributes'
);

-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a concept_attributes row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the concept_attributes row'
);

-- 8. A case_types viewer cannot add an attribute.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit)
  values ('f200c002-0000-4000-8000-000000000002'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'viewer attribute', 'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a concept_attributes row'
);

-- 9. A case_types editor adds an attribute.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit)
  values ('f200c003-0000-4000-8000-000000000003'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f200b003-0000-4000-8000-000000000003'::uuid, 'editor attribute', 'varchar'::public.datasets__ava_data_type, 'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true);
  reset role;
  $t9$,
  'a case_types editor inserts a concept_attributes row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set name = 'viewer tried update'
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a002-0000-4000-8000-000000000002'::uuid and t.name = 'editable attribute'
    ) <> 1 then
      raise exception 'a case_types viewer updated a concept_attributes row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a concept_attributes row'
);

-- 11. A case_types editor renames an attribute.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set name = 'renamed by editor'
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a002-0000-4000-8000-000000000002'::uuid and t.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'a case_types editor could not update a concept_attributes row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a concept_attributes row'
);

-- 12. The WITH CHECK clause stops an editor moving an attribute into a
-- workspace where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.concept_attributes
  set workspace_id = 'f2001002-0000-4000-8000-000000000002'::uuid
  where id = 'f200a002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a concept_attributes row into another workspace'
);

-- 13. A case_types viewer's DELETE is filtered, so the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.concept_attributes where id = 'f200a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer deleted a concept_attributes row';
    end if;
  end $chk$;
  $t13$,
  'a case_types viewer cannot delete a concept_attributes row'
);

-- 14. A case_types editor removes an attribute.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f2000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.concept_attributes where id = 'f200a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_attributes t
      where t.id = 'f200a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_types editor could not delete a concept_attributes row';
    end if;
  end $chk$;
  $t14$,
  'a case_types editor deletes a concept_attributes row'
);

select * from finish ();

rollback;
