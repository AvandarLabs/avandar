\set ON_ERROR_STOP on

/**
 * RLS for `data_dictionaries` and its three child tables.
 *
 *   viewer: SELECT everything in the workspace
 *   editor: INSERT and UPDATE dictionaries, DELETE their own
 *   admin:  DELETE any dictionary in the workspace
 *
 * Children are select-only for signed-in users: entries, code lists, and
 * codings change only through `rpc_data_dictionaries__save`. A signed-in
 * user cannot move a dictionary to another workspace or edit its version
 * or owner directly.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('dd000001-0000-4000-8000-000000000001'::uuid, 'dict_owner@test.dev', 'authenticated', 'authenticated'),
  ('dd000002-0000-4000-8000-000000000002'::uuid, 'dict_viewer@test.dev', 'authenticated', 'authenticated'),
  ('dd000003-0000-4000-8000-000000000003'::uuid, 'dict_editor@test.dev', 'authenticated', 'authenticated'),
  ('dd000004-0000-4000-8000-000000000004'::uuid, 'dict_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dict rls ws', 'dict-rls-ws'),
  ('dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dict other ws', 'dict-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('dd200001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid),
  ('dd200002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid),
  ('dd200003-0000-4000-8000-000000000003'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid),
  ('dd200004-0000-4000-8000-000000000004'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('dd300001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('dd300002-0000-4000-8000-000000000002'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('dd300003-0000-4000-8000-000000000003'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('dd300004-0000-4000-8000-000000000004'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The viewer gets Global Viewer, everyone else in the workspace Global
-- Editor. The owner is also the workspace owner, which is the admin path.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'dd000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('dd400001-0000-4000-8000-000000000001'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000001-0000-4000-8000-000000000001'::uuid, 'dd300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('dd400002-0000-4000-8000-000000000002'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'Editor codes'),
  ('dd400003-0000-4000-8000-000000000003'::uuid, 'dd100002-0000-4000-8000-000000000002'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd300004-0000-4000-8000-000000000004'::uuid, 'Other workspace codes'),
  ('dd400004-0000-4000-8000-000000000004'::uuid, 'dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'Admin deletes this')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values (
  'dd500001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'Sex (1/2/9)',
  '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb
);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values (
  'dd600001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'sex',
  'categorical',
  0
);

insert into public.data_dictionaries__entry_codings (id, workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values (
  'dd700001-0000-4000-8000-000000000001'::uuid,
  'dd100001-0000-4000-8000-000000000001'::uuid,
  'dd400001-0000-4000-8000-000000000001'::uuid,
  'dd600001-0000-4000-8000-000000000001'::uuid,
  'dd500001-0000-4000-8000-000000000001'::uuid,
  true
);

select plan (20);

-- 1. A viewer reads a dictionary in their workspace.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'viewer cannot read the dictionary';
    end if;
  end $chk$;
  $t1$,
  'a viewer reads a dictionary in their workspace'
);
reset role;

-- 2. A viewer reads its code lists, entries, and codings.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries__code_lists where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
      or (select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
      or (select count(*)::int from public.data_dictionaries__entry_codings where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1
    then
      raise exception 'viewer cannot read the dictionary contents';
    end if;
  end $chk$;
  $t2$,
  'a viewer reads code lists, entries, and codings'
);
reset role;

-- 3. A member of another workspace reads none of it.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__code_lists where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__entries where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
      or (select count(*)::int from public.data_dictionaries__entry_codings where workspace_id = 'dd100001-0000-4000-8000-000000000001'::uuid) <> 0
    then
      raise exception 'outsider read another workspace''s dictionaries';
    end if;
  end $chk$;
  $t3$,
  'a user outside the workspace reads no dictionaries or contents'
);
reset role;

-- 4. Anonymous callers cannot reach the table.
select throws_ok (
  $t4$
  set local role anon;
  select count(*) from public.data_dictionaries;
  $t4$,
  '42501',
  null,
  'anon cannot select dictionaries'
);
reset role;

-- 5. A viewer cannot create a dictionary.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000002-0000-4000-8000-000000000002'::uuid, 'dd300002-0000-4000-8000-000000000002'::uuid, 'viewer attempt');
  $t5$,
  '42501',
  null,
  'a viewer cannot create a dictionary'
);
reset role;

-- 6. An editor creates a dictionary they own.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'editor dictionary');
  $t6$,
  'an editor creates a dictionary'
);
reset role;

-- 7. A user outside the workspace cannot create a dictionary in it. The
-- owner-profile trigger refuses first (23514), because an outsider has no
-- profile in this workspace.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000004-0000-4000-8000-000000000004'::uuid, 'dd300004-0000-4000-8000-000000000004'::uuid, 'outsider attempt');
  $t7$,
  '23514',
  null,
  'a user outside the workspace cannot create a dictionary in it'
);
reset role;

-- 8. An editor renames another member's dictionary.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'NYS codes (renamed)' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 'NYS codes (renamed)' then
      raise exception 'editor rename did not apply';
    end if;
  end $chk$;
  $t8$,
  'an editor renames a dictionary'
);

-- 9. A viewer's update is filtered out.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'viewer rename' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) = 'viewer rename' then
      raise exception 'viewer renamed a dictionary';
    end if;
  end $chk$;
  $t9$,
  'a viewer cannot rename a dictionary'
);

-- 10. An outsider's update is filtered out.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.data_dictionaries set name = 'outsider rename' where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select name from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) = 'outsider rename' then
      raise exception 'outsider renamed a dictionary';
    end if;
  end $chk$;
  $t10$,
  'a user outside the workspace cannot rename a dictionary'
);

-- 11. A dictionary cannot move to another workspace.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set workspace_id = 'dd100002-0000-4000-8000-000000000002'::uuid where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  $t11$,
  '23514',
  null,
  'a dictionary cannot be moved to another workspace'
);
reset role;

-- 12. A signed-in user cannot set the version directly.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries set version = 99 where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  $t12$,
  '42501',
  null,
  'the version only changes through the save RPC'
);
reset role;

-- 13. An editor cannot delete another member's dictionary.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an editor deleted another member''s dictionary';
    end if;
  end $chk$;
  $t13$,
  'an editor cannot delete another member''s dictionary'
);

-- 14. A viewer cannot delete.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'a viewer deleted a dictionary';
    end if;
  end $chk$;
  $t14$,
  'a viewer cannot delete a dictionary'
);

-- 15. An editor deletes their own dictionary.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400002-0000-4000-8000-000000000002'::uuid) <> 0 then
      raise exception 'an editor could not delete their own dictionary';
    end if;
  end $chk$;
  $t15$,
  'an editor deletes their own dictionary'
);

-- 16. A workspace admin deletes another member's dictionary.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'dd400004-0000-4000-8000-000000000004'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.data_dictionaries where id = 'dd400004-0000-4000-8000-000000000004'::uuid) <> 0 then
      raise exception 'an admin could not delete another member''s dictionary';
    end if;
  end $chk$;
  $t16$,
  'a workspace admin deletes another member''s dictionary'
);

-- 17. An editor cannot write a code list directly.
select throws_ok (
  $t17$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.data_dictionaries__code_lists (workspace_id, dictionary_id, name, pairs)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd400001-0000-4000-8000-000000000001'::uuid, 'direct write', '[]'::jsonb);
  $t17$,
  '42501',
  null,
  'code lists are written only through the save RPC'
);
reset role;

-- 18. An editor cannot edit an entry directly.
select throws_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.data_dictionaries__entries set name = 'direct' where id = 'dd600001-0000-4000-8000-000000000001'::uuid;
  $t18$,
  '42501',
  null,
  'entries are written only through the save RPC'
);
reset role;

-- 19. Deleting a dictionary deletes its contents.
delete from public.data_dictionaries where id = 'dd400001-0000-4000-8000-000000000001'::uuid;
select is (
  (
    select count(*)::int from public.data_dictionaries__code_lists where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ) + (
    select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ) + (
    select count(*)::int from public.data_dictionaries__entry_codings where dictionary_id = 'dd400001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'deleting a dictionary deletes its code lists, entries, and codings'
);

-- 20. A signed-in user cannot insert a dictionary with a preset version.
select throws_ok (
  $t20$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"dd000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.data_dictionaries (workspace_id, owner_id, owner_profile_id, name, version)
  values ('dd100001-0000-4000-8000-000000000001'::uuid, 'dd000003-0000-4000-8000-000000000003'::uuid, 'dd300003-0000-4000-8000-000000000003'::uuid, 'preset version', 99);
  $t20$,
  '42501',
  null,
  'an editor cannot insert a dictionary with a version other than 1'
);
reset role;

select * from finish ();

rollback;
