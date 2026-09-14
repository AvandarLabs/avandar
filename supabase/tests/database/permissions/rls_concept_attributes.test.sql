\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `concept_attributes`.
 *
 * Locks this table's four policies: a member of one workspace must not read, insert, update, or delete another
 * workspace's rows, and `anon` must not reach the table at all.
 *
 * Read directly the policies look correct, all four gating on
 * `workspace_id = any(array(select util__get_auth_user_workspaces()))`. This
 * file exists so that nothing silently narrows or drops that predicate later.
 *
 * The label/identifier trigger requires exactly one `is_label` attribute per
 * concept, so the second attribute here is deliberately not a label.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs_insider@test.dev', 'authenticated', 'authenticated'),
  ('f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'conceptattrs ws a', 'conceptattrs-ws-a'),
  ('f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid, 'conceptattrs ws b', 'conceptattrs-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('f2002001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid),
  ('f2002002-0000-4000-8000-000000000002'::uuid, 'f2001002-0000-4000-8000-000000000002'::uuid, 'f2000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f200b003-0000-4000-8000-000000000003'::uuid, 'f2000001-0000-4000-8000-000000000001'::uuid, 'f2001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
on conflict (id) do nothing;

insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit
)
values (
  'f200a001-0000-4000-8000-000000000001'::uuid,
  'f2001001-0000-4000-8000-000000000001'::uuid,
  'f200b003-0000-4000-8000-000000000003'::uuid,
  'ws a attribute',
  'varchar'::public.datasets__ava_data_type,
  'manual_entry'::public.concept_attributes__mapping_type,
  true, false, false, true
)
on conflict (id) do nothing;

select plan (6);

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

select * from finish ();

rollback;
