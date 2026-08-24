\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `attribute_mappings__manual_entry`.
 *
 * Locks the four policies this table gained during the 2026-08 crunch: a
 * member of one workspace must not read, insert, update, or delete another
 * workspace's rows, and `anon` must not reach the table at all.
 *
 * Read directly the policies look correct, all four gating on
 * `workspace_id = any(array(select util__get_auth_user_workspaces()))`. This
 * file exists so that nothing silently narrows or drops that predicate later.
 * See docs/audits/2026-08-19-catchup-audit.md, finding F-4.
 *
 * `concept_attribute_id` is unique, so the outsider's insert attempt uses a
 * second attribute.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman_insider@test.dev', 'authenticated', 'authenticated'),
  ('f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'attrmapman ws a', 'attrmapman-ws-a'),
  ('f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid, 'attrmapman ws b', 'attrmapman-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('f6002001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid),
  ('f6002002-0000-4000-8000-000000000002'::uuid, 'f6001002-0000-4000-8000-000000000002'::uuid, 'f6000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation)
values ('f600b003-0000-4000-8000-000000000003'::uuid, 'f6000001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'host concept', true)
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
   'manual_entry'::public.concept_attributes__mapping_type, false, false, false, true)
on conflict (id) do nothing;

insert into public.attribute_mappings__manual_entry (
  id, workspace_id, concept_attribute_id
)
values ('f600a001-0000-4000-8000-000000000001'::uuid, 'f6001001-0000-4000-8000-000000000001'::uuid, 'f600b001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

select plan (6);

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

select * from finish ();

rollback;
