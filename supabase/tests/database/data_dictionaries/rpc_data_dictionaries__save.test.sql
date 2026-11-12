\set ON_ERROR_STOP on

/**
 * `rpc_data_dictionaries__save` replaces a dictionary's code lists,
 * entries, and codings in one transaction and bumps its version once.
 * Refusals raise a stable `hint` and change nothing.
 */
begin;

set search_path to extensions, public;

create function pg_temp.error_hint (p_sql text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return 'no error';
exception
  when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return v_hint;
end;
$$;

-- Runs one save as the given user and returns its hint, or 'no error'.
create function pg_temp.save_as (p_user_id uuid, p_dictionary_id uuid, p_code_lists jsonb, p_entries jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_data_dictionaries__save (%L::uuid, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dictionary_id,
    p_code_lists,
    p_entries
  ));
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('de000001-0000-4000-8000-000000000001'::uuid, 'dict_save_editor@test.dev', 'authenticated', 'authenticated'),
  ('de000002-0000-4000-8000-000000000002'::uuid, 'dict_save_viewer@test.dev', 'authenticated', 'authenticated'),
  ('de000003-0000-4000-8000-000000000003'::uuid, 'dict_save_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- The editor owns the dictionary's workspace; the outsider owns another.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'dict save ws', 'dict-save-ws'),
  ('de100002-0000-4000-8000-000000000002'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid, 'dict save other', 'dict-save-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('de200001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid),
  ('de200002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000002-0000-4000-8000-000000000002'::uuid),
  ('de200003-0000-4000-8000-000000000003'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('de300001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de200001-0000-4000-8000-000000000001'::uuid, 'Editor', 'Editor'),
  ('de300002-0000-4000-8000-000000000002'::uuid, 'de000002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('de300003-0000-4000-8000-000000000003'::uuid, 'de000003-0000-4000-8000-000000000003'::uuid, 'de100002-0000-4000-8000-000000000002'::uuid, 'de200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'de100001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'de000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('de400001-0000-4000-8000-000000000001'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de300001-0000-4000-8000-000000000001'::uuid, 'Save target'),
  ('de400002-0000-4000-8000-000000000002'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de000001-0000-4000-8000-000000000001'::uuid, 'de300001-0000-4000-8000-000000000001'::uuid, 'Another dictionary')
on conflict (id) do nothing;

-- A code list that belongs to the other dictionary.
insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values ('de500009-0000-4000-8000-000000000009'::uuid, 'de100001-0000-4000-8000-000000000001'::uuid, 'de400002-0000-4000-8000-000000000002'::uuid, 'Not yours', '[]'::jsonb);

select plan (19);

-- Refusals. None of them changes anything.

-- 1.
select is (
  pg_temp.save_as ('de000002-0000-4000-8000-000000000002'::uuid, 'de400001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb, '[]'::jsonb),
  'dictionary_editor_required',
  'a Data Sources viewer cannot save a dictionary'
);
reset role;

-- 2.
select is (
  pg_temp.save_as ('de000003-0000-4000-8000-000000000003'::uuid, 'de400001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb, '[]'::jsonb),
  'dictionary_editor_required',
  'a user outside the workspace cannot save a dictionary'
);
reset role;

-- 3.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"  ","is_ordered":false,"pairs":[]}]'::jsonb,
    '[]'::jsonb
  ),
  'code_list_name_required',
  'a code list needs a name'
);
reset role;

-- 4.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"1","label":" ","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'code_pair_incomplete',
  'every pair needs a code and a label'
);
reset role;

-- 5.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"M","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"m","label":"Man","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'codes_not_unique',
  'two codes that differ only in case are refused'
);
reset role;

-- 6.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":["male"],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'labels_not_unique',
  'an accepted spelling cannot repeat another pair''s label'
);
reset role;

-- 7.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"Sex","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[]},{"id":"de600002-0000-4000-8000-000000000002","name":"sex ","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'entry_names_not_unique',
  'two entries cannot share a name ignoring case and spaces'
);
reset role;

-- 8.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age","column_names":[],"kind":"number","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  ),
  'coding_kind_mismatch',
  'only categorical and ordered entries recognize code lists'
);
reset role;

-- 9.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  ),
  'coding_list_not_in_dictionary',
  'a coding must point at a code list in the same save'
);
reset role;

-- 10.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex (1/2)","is_ordered":false,"pairs":[]},{"id":"de500002-0000-4000-8000-000000000002","name":"Sex (M/F)","is_ordered":false,"pairs":[]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":false},{"code_list_id":"de500002-0000-4000-8000-000000000002","is_primary":false}]}]'::jsonb
  ),
  'coding_primary_required',
  'an entry with code lists names exactly one primary'
);
reset role;

-- 11.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age","column_names":[],"kind":"number","unit":"years","valid_min":120,"valid_max":0,"description":null,"position":0,"codings":[]}]'::jsonb
  ),
  'entry_range_invalid',
  'the lowest valid value cannot exceed the highest'
);
reset role;

-- 12.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500009-0000-4000-8000-000000000009","name":"Stolen","is_ordered":false,"pairs":[]}]'::jsonb,
    '[]'::jsonb
  ),
  'item_not_in_dictionary',
  'a code list from another dictionary cannot be saved into this one'
);
reset role;

-- 12b. The same code list id twice in one payload.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"A","is_ordered":false,"pairs":[]},{"id":"de500001-0000-4000-8000-000000000001","name":"B","is_ordered":false,"pairs":[]}]'::jsonb,
    '[]'::jsonb
  ),
  'dictionary_payload_invalid',
  'a code list id cannot appear twice'
);
reset role;

-- 12c. One entry listing the same code list twice.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true},{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":false}]}]'::jsonb
  ),
  'dictionary_payload_invalid',
  'an entry cannot list the same code list twice'
);
reset role;

-- 13. Nothing above changed the dictionary.
select is (
  (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid) * 1000 + (
    select count(*)::int from public.data_dictionaries__entries where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid
  ),
  1000,
  'refused saves leave the version at 1 and add no entries'
);

-- A save that succeeds.

-- 14.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":["M"],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":["F"],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]}]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"sex","column_names":["GENDER"],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":"Sex recorded on the case report.","position":0,"codings":[{"code_list_id":"de500001-0000-4000-8000-000000000001","is_primary":true}]},{"id":"de600002-0000-4000-8000-000000000002","name":"age_years","column_names":["age"],"kind":"number","unit":"years","valid_min":0,"valid_max":120,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'no error',
  'a Data Sources editor saves code lists, entries, and codings'
);
reset role;

-- 15.
select is (
  format(
    'v%s lists=%s entries=%s primary=%s columns=%s',
    (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__code_lists where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entries where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entry_codings where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid and is_primary),
    (select array_to_string(column_names, ',') from public.data_dictionaries__entries where id = 'de600001-0000-4000-8000-000000000001'::uuid)
  ),
  'v2 lists=1 entries=2 primary=1 columns=GENDER',
  'the save wrote everything and bumped the version once'
);

-- 16. A second save swaps two entry names and drops the code list.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb,
    '[{"id":"de600001-0000-4000-8000-000000000001","name":"age_years","column_names":[],"kind":"number","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[]},{"id":"de600002-0000-4000-8000-000000000002","name":"sex","column_names":[],"kind":"text","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[]}]'::jsonb
  ),
  'no error',
  'a save that swaps two entry names and removes a code list succeeds'
);
reset role;

-- 17. Read in its own statement: the outer query of a statement does not
-- see writes made by a function it calls.
select is (
  format(
    'v%s lists=%s codings=%s first=%s',
    (select version from public.data_dictionaries where id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__code_lists where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.data_dictionaries__entry_codings where dictionary_id = 'de400001-0000-4000-8000-000000000001'::uuid),
    (select name from public.data_dictionaries__entries where id = 'de600001-0000-4000-8000-000000000001'::uuid)
  ),
  'v3 lists=0 codings=0 first=age_years',
  'the second save swapped the names, removed the list and its codings, and made version 3'
);

select * from finish ();

rollback;
