\set ON_ERROR_STOP on

/**
 * RLS for `attribute_mappings__manual_entry`.
 *
 * Every workspace member reads the table, whatever their case roles. A
 * mapping is part of a case type's design, so INSERT, UPDATE, and DELETE
 * require `case_types` editor. A member of another workspace can do none of
 * it, and `anon` cannot reach the table at all.
 *
 * Workspace owners pass every app-role check, so the role-level cases use
 * non-owner members whose custom role groups grant exactly one level.
 *
 * `concept_attribute_id` is unique, so every mapping, every insert attempt,
 * and the repoint target uses its own attribute.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman_insider@test.dev', 'authenticated', 'authenticated'),
  ('f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman_outsider@test.dev', 'authenticated', 'authenticated'),
  ('f6000003-0000-4000-8000-000000000003'::uuid, 'attrmapman_types_viewer@test.dev', 'authenticated', 'authenticated'),
  ('f6000004-0000-4000-8000-000000000004'::uuid, 'attrmapman_types_editor@test.dev', 'authenticated', 'authenticated'),
  ('f6000005-0000-4000-8000-000000000005'::uuid, 'attrmapman_no_case_role@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman ws a', 'attrmapman-ws-a'),
  ('f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman ws b', 'attrmapman-ws-b')
on conflict (id) do nothing;

-- One custom role group per member below, each granting exactly the role a
-- test names.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('f6004003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman types viewer', false),
  ('f6004004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman types editor', false),
  ('f6004005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'attrmapman no case role', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('f6004003-0000-4000-8000-000000000003'::uuid, 'case_types'::public.app_type, 'viewer'::public.role_level),
  ('f6004004-0000-4000-8000-000000000004'::uuid, 'case_types'::public.app_type, 'editor'::public.role_level),
  ('f6004005-0000-4000-8000-000000000005'::uuid, 'data_explorer'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('f6002001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, null),
  ('f6002002-0000-4000-8000-000000000002'::uuid, 'f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid, null),
  ('f6002003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000003-0000-4000-8000-000000000003'::uuid, 'f6004003-0000-4000-8000-000000000003'::uuid),
  ('f6002004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000004-0000-4000-8000-000000000004'::uuid, 'f6004004-0000-4000-8000-000000000004'::uuid),
  ('f6002005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000005-0000-4000-8000-000000000005'::uuid, 'f6004005-0000-4000-8000-000000000005'::uuid)
on conflict (id) do nothing;

-- Case types the tests below read and write. Every seeded concept is in this
-- one block.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('f600b003-0000-4000-8000-000000000003'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'host concept', true, 'f600c003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('f600c003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'Active', '#40c057', 0)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values
  ('f600b001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'mapped attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, true, false, false, true),
  ('f600b002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'spare attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b004-0000-4000-8000-000000000004'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'editor attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b005-0000-4000-8000-000000000005'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'editable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b006-0000-4000-8000-000000000006'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'disposable mapping attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true),
  ('f600b007-0000-4000-8000-000000000007'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b003-0000-4000-8000-000000000003'::uuid, 'repoint target attribute',
   'varchar'::public.datasets__ava_data_type,
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

insert into public.attribute_mappings__manual_entry (
  id, workspace_id, concept_attribute_id
)
values
  ('f600a001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b001-0000-4000-8000-000000000001'::uuid),
  ('f600a002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b005-0000-4000-8000-000000000005'::uuid),
  ('f600a003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b006-0000-4000-8000-000000000006'::uuid)
on conflict (id) do nothing;

select plan (14);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the attribute_mappings__manual_entry row'
);

-- 2. A member of another workspace reads nothing. This is the cross-tenant
-- boundary: the whole point of the file.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.workspace_id = 'f6001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read attribute_mappings__manual_entry rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no attribute_mappings__manual_entry rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__manual_entry (id, workspace_id, concept_attribute_id)
  values ('f600b003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b002-0000-4000-8000-000000000002'::uuid);
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a attribute_mappings__manual_entry row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
-- Checked as the superuser after resetting the role.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set concept_attribute_id = 'f600b002-0000-4000-8000-000000000002'::uuid
  where id = 'f600a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a001-0000-4000-8000-000000000001'::uuid and t.concept_attribute_id = 'f600b001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider updated a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a attribute_mappings__manual_entry row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__manual_entry where id = 'f600a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a attribute_mappings__manual_entry row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.attribute_mappings__manual_entry;
  $t6$,
  '42501',
  null,
  'anon cannot select attribute_mappings__manual_entry'
);

-- 7. Reads stay open to every member: one with no case_types role still
-- reads the row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000005-0000-4000-8000-000000000005","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a member with no case_types role cannot read a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  reset role;
  $t7$,
  'a member with no case_types role still selects the attribute_mappings__manual_entry row'
);

-- 8. A case_types viewer cannot add a mapping.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__manual_entry (id, workspace_id, concept_attribute_id)
  values ('f600c002-0000-4000-8000-000000000002'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '42501',
  null,
  'a case_types viewer cannot insert a attribute_mappings__manual_entry row'
);

-- 9. A case_types editor adds a mapping.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.attribute_mappings__manual_entry (id, workspace_id, concept_attribute_id)
  values ('f600c003-0000-4000-8000-000000000003'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b004-0000-4000-8000-000000000004'::uuid);
  reset role;
  $t9$,
  'a case_types editor inserts a attribute_mappings__manual_entry row'
);

-- 10. The USING clause filters a case_types viewer's UPDATE, so the row is
-- untouched.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a002-0000-4000-8000-000000000002'::uuid and t.concept_attribute_id = 'f600b005-0000-4000-8000-000000000005'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer updated a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t10$,
  'a case_types viewer cannot update a attribute_mappings__manual_entry row'
);

-- 11. A case_types editor repoints a mapping at another attribute.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a002-0000-4000-8000-000000000002'::uuid and t.concept_attribute_id = 'f600b007-0000-4000-8000-000000000007'::uuid
    ) <> 1 then
      raise exception 'a case_types editor could not update a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t11$,
  'a case_types editor updates a attribute_mappings__manual_entry row'
);

-- 12. The WITH CHECK clause stops an editor moving a mapping into a workspace
-- where they hold no role.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.attribute_mappings__manual_entry
  set workspace_id = 'f6001002-0000-4000-8000-000000000002'::uuid
  where id = 'f600a002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'a case_types editor cannot move a attribute_mappings__manual_entry row into another workspace'
);

-- 13. A case_types viewer's DELETE is filtered, so the row survives.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__manual_entry where id = 'f600a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'a case_types viewer deleted a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t13$,
  'a case_types viewer cannot delete a attribute_mappings__manual_entry row'
);

-- 14. A case_types editor removes a mapping.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"f6000004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.attribute_mappings__manual_entry where id = 'f600a003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.attribute_mappings__manual_entry t
      where t.id = 'f600a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'a case_types editor could not delete a attribute_mappings__manual_entry row';
    end if;
  end $chk$;
  $t14$,
  'a case_types editor deletes a attribute_mappings__manual_entry row'
);

select * from finish ();

rollback;
