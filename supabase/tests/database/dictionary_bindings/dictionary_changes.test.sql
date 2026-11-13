\set ON_ERROR_STOP on

/**
 * What happens to bindings when the dictionary under them changes. A live
 * convert binding (a linked dataset's) is pinned to its code list's pairs
 * before the list, its entry, or its dictionary is deleted, and its
 * column's type follows the live list until then. A pinned binding never
 * changes. A reference binding whose list a save deleted is pointed at its
 * entry's only remaining list.
 */
begin;

set search_path to extensions, public;

-- Runs one dictionary save as the workspace owner.
create function pg_temp.save_as_owner (p_code_lists jsonb, p_entries jsonb) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"sub":"d2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  perform public.rpc_data_dictionaries__save ('d2400001-0000-4000-8000-000000000001'::uuid, p_code_lists, p_entries);
  reset role;
end;
$$;

-- One entry as the save RPC takes it.
create function pg_temp.entry (p_id uuid, p_name text, p_position integer, p_codings jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', p_id, 'name', p_name, 'column_names', '[]'::jsonb, 'kind', 'categorical',
    'unit', null, 'valid_min', null, 'valid_max', null, 'description', null,
    'position', p_position, 'codings', p_codings
  );
$$;

insert into auth.users (id, email, aud, role)
values ('d2000001-0000-4000-8000-000000000001'::uuid, 'conv_changes_owner@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('d2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'conv changes ws', 'conv-changes-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('d2200001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('d2300001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

-- A source, its linked dataset (live bindings), and a dataset converted in
-- place (pinned bindings).
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('d2450001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('d2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2300001-0000-4000-8000-000000000001'::uuid, 'Kings (labeled)', 'virtual'::public.datasets__source_type),
  ('d2450003-0000-4000-8000-000000000003'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
values ('d2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d2450001-0000-4000-8000-000000000001"', 'd2450001-0000-4000-8000-000000000001'::uuid);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('d2460001-0000-4000-8000-000000000001'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d2460002-0000-4000-8000-000000000002'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'sex_label', 'sex_label', 'VARCHAR', 'VARCHAR', 'bigint', 1),
  ('d2460003-0000-4000-8000-000000000003'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'hosp', 'hosp', 'VARCHAR', 'VARCHAR', 'varchar', 2),
  ('d2460004-0000-4000-8000-000000000004'::uuid, 'd2450003-0000-4000-8000-000000000003'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d2460005-0000-4000-8000-000000000005'::uuid, 'd2450003-0000-4000-8000-000000000003'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'sex_label', 'sex_label', 'VARCHAR', 'VARCHAR', 'bigint', 1),
  ('d2460006-0000-4000-8000-000000000006'::uuid, 'd2450001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'hosp', 'hosp', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('d2460007-0000-4000-8000-000000000007'::uuid, 'd2450001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 1),
  ('d2460008-0000-4000-8000-000000000008'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'sex_draft', 'sex_draft', 'VARCHAR', 'VARCHAR', 'bigint', 3);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('d2400001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2000001-0000-4000-8000-000000000001'::uuid, 'd2300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('d2500001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]'::jsonb),
  ('d2500002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'Yes/No', '[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d2500004-0000-4000-8000-000000000004'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'Sex (M/F)', '[{"code":"M","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"F","label":"Female","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d2500006-0000-4000-8000-000000000006'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'Sex (draft)', '[]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('d2600001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('d2600002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'hospitalized', 'categorical', 1),
  ('d2600003-0000-4000-8000-000000000003'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'sex_draft', 'categorical', 2);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('d2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600003-0000-4000-8000-000000000003'::uuid, 'd2500006-0000-4000-8000-000000000006'::uuid, true),
  ('d2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500001-0000-4000-8000-000000000001'::uuid, true),
  ('d2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500004-0000-4000-8000-000000000004'::uuid, false),
  ('d2100001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600002-0000-4000-8000-000000000002'::uuid, 'd2500002-0000-4000-8000-000000000002'::uuid, true);

-- Live convert bindings on the linked dataset, pinned ones on Bronx, and
-- reference bindings on the source.
insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, mode, direction, applied_dictionary_version, pinned_pairs, pinned_is_ordered, replaced_data_type)
values
  ('d2470001-0000-4000-8000-000000000001'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2460001-0000-4000-8000-000000000001'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500001-0000-4000-8000-000000000001'::uuid, 'convert', 'decode', 1, null, null, 'bigint'),
  ('d2470002-0000-4000-8000-000000000002'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2460002-0000-4000-8000-000000000002'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500001-0000-4000-8000-000000000001'::uuid, 'convert', 'encode', 1, null, null, 'varchar'),
  ('d2470003-0000-4000-8000-000000000003'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2460003-0000-4000-8000-000000000003'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600002-0000-4000-8000-000000000002'::uuid, 'd2500002-0000-4000-8000-000000000002'::uuid, 'convert', 'decode', 1, null, null, 'varchar'),
  ('d2470004-0000-4000-8000-000000000004'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450003-0000-4000-8000-000000000003'::uuid, 'd2460004-0000-4000-8000-000000000004'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500001-0000-4000-8000-000000000001'::uuid, 'convert', 'decode', 1, (select pairs from public.data_dictionaries__code_lists where id = 'd2500001-0000-4000-8000-000000000001'::uuid), false, 'bigint'),
  ('d2470005-0000-4000-8000-000000000005'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450003-0000-4000-8000-000000000003'::uuid, 'd2460005-0000-4000-8000-000000000005'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500001-0000-4000-8000-000000000001'::uuid, 'convert', 'encode', 1, (select pairs from public.data_dictionaries__code_lists where id = 'd2500001-0000-4000-8000-000000000001'::uuid), false, 'varchar'),
  ('d2470008-0000-4000-8000-000000000008'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450002-0000-4000-8000-000000000002'::uuid, 'd2460008-0000-4000-8000-000000000008'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600003-0000-4000-8000-000000000003'::uuid, 'd2500006-0000-4000-8000-000000000006'::uuid, 'convert', 'encode', 1, null, null, 'varchar');

insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, applied_dictionary_version)
values
  ('d2470006-0000-4000-8000-000000000006'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450001-0000-4000-8000-000000000001'::uuid, 'd2460006-0000-4000-8000-000000000006'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600002-0000-4000-8000-000000000002'::uuid, 'd2500002-0000-4000-8000-000000000002'::uuid, 1),
  ('d2470007-0000-4000-8000-000000000007'::uuid, 'd2100001-0000-4000-8000-000000000001'::uuid, 'd2450001-0000-4000-8000-000000000001'::uuid, 'd2460007-0000-4000-8000-000000000007'::uuid, 'd2400001-0000-4000-8000-000000000001'::uuid, 'd2600001-0000-4000-8000-000000000001'::uuid, 'd2500004-0000-4000-8000-000000000004'::uuid, 1);

select plan (28);

-- 1.
select hasnt_function ('public', 'dataset_columns__dictionary_bindings__remove_for_dictionary', 'the remove-only dictionary trigger is gone');

-- 2.
select hasnt_function ('public', 'dataset_columns__dictionary_bindings__remove_for_entry', 'the remove-only entry trigger is gone');

-- The output type rule.

-- 3.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('decode', '[{"code":"1","label":"Male"}]'::jsonb),
  'varchar'::public.datasets__ava_data_type,
  'decoding outputs labels as text'
);

-- 4.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', '[{"code":" 12 ","label":"A"},{"code":"-3","label":"B"}]'::jsonb),
  'bigint'::public.datasets__ava_data_type,
  'encoding to whole-number codes outputs bigint, ignoring spaces around a code'
);

-- 5.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', '[{"code":"1","label":"A"},{"code":"U","label":"B"}]'::jsonb),
  'varchar'::public.datasets__ava_data_type,
  'one text code makes the output text'
);

-- 6.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', '[{"code":"1.5","label":"A"}]'::jsonb),
  'varchar'::public.datasets__ava_data_type,
  'a decimal code makes the output text'
);

-- 7.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', '[{"code":"1234567890123456789","label":"A"}]'::jsonb),
  'varchar'::public.datasets__ava_data_type,
  'a code of 19 digits makes the output text'
);

-- 8.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', '[]'::jsonb),
  'varchar'::public.datasets__ava_data_type,
  'an empty list outputs text'
);

-- 9.
select is (
  public.dataset_columns__dictionary_bindings__get_output_data_type ('encode', null),
  'varchar'::public.datasets__ava_data_type,
  'no pairs output text'
);

-- A save that adds the code U to Sex (1/2/9), replaces Yes/No with
-- Y/N/U, and replaces Sex (M/F) with Sex (m/f/x) while sex keeps two lists.

-- 10.
select lives_ok (
  $t10$
  select pg_temp.save_as_owner (
    '[
      {"id":"d2500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true},{"code":"U","label":"Not stated","accepted_spellings":[],"is_missing":true}]},
      {"id":"d2500003-0000-4000-8000-000000000003","name":"Y/N/U","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false},{"code":"U","label":"Unknown","accepted_spellings":[],"is_missing":true}]},
      {"id":"d2500005-0000-4000-8000-000000000005","name":"Sex (m/f/x)","is_ordered":false,"pairs":[{"code":"m","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"f","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"x","label":"Other","accepted_spellings":[],"is_missing":false}]},
      {"id":"d2500006-0000-4000-8000-000000000006","name":"Sex (draft)","is_ordered":false,"pairs":[]}
    ]'::jsonb,
    jsonb_build_array(
      pg_temp.entry ('d2600001-0000-4000-8000-000000000001'::uuid, 'sex', 0, '[{"code_list_id":"d2500001-0000-4000-8000-000000000001","is_primary":true},{"code_list_id":"d2500005-0000-4000-8000-000000000005","is_primary":false}]'::jsonb),
      pg_temp.entry ('d2600002-0000-4000-8000-000000000002'::uuid, 'hospitalized', 1, '[{"code_list_id":"d2500003-0000-4000-8000-000000000003","is_primary":true}]'::jsonb),
      pg_temp.entry ('d2600003-0000-4000-8000-000000000003'::uuid, 'sex_draft', 2, '[{"code_list_id":"d2500006-0000-4000-8000-000000000006","is_primary":true}]'::jsonb)
    )
  );
  $t10$,
  'the owner saves the dictionary, deleting two code lists'
);

-- 11.
select results_eq (
  $q$
    select pinned_pairs, pinned_is_ordered, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'd2470003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$
    values (
      '[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false}]'::jsonb,
      false,
      null::uuid
    )
  $q$,
  'a live convert binding is pinned to its deleted code list''s pairs'
);

-- 12.
select results_eq (
  $q$
    select entry_id, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'd2470006-0000-4000-8000-000000000006'::uuid
  $q$,
  $q$ values ('d2600002-0000-4000-8000-000000000002'::uuid, 'd2500003-0000-4000-8000-000000000003'::uuid) $q$,
  'a reference binding follows its entry''s only remaining code list'
);

-- 13.
select is (
  (select code_list_id from public.dataset_columns__dictionary_bindings where id = 'd2470007-0000-4000-8000-000000000007'::uuid),
  null::uuid,
  'a reference binding whose entry is left two lists keeps none'
);

-- 14.
select results_eq (
  $q$
    select pinned_pairs is null, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'd2470001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values (true, 'd2500001-0000-4000-8000-000000000001'::uuid) $q$,
  'a live binding whose list survives stays live'
);

-- 15.
select is (
  (select data_type from public.dataset_columns where id = 'd2460002-0000-4000-8000-000000000002'::uuid),
  'varchar'::public.datasets__ava_data_type,
  'a live encoded column becomes text once its list gains a text code'
);

-- 16.
select is (
  (select data_type from public.dataset_columns where id = 'd2460001-0000-4000-8000-000000000001'::uuid),
  'varchar'::public.datasets__ava_data_type,
  'a live decoded column stays text'
);

-- 17.
select is (
  (select data_type from public.dataset_columns where id = 'd2460008-0000-4000-8000-000000000008'::uuid),
  'varchar'::public.datasets__ava_data_type,
  'a live encoded column whose list has no values yet is text'
);

-- 18.
select is (
  (select jsonb_array_length(pinned_pairs) from public.dataset_columns__dictionary_bindings where id = 'd2470004-0000-4000-8000-000000000004'::uuid),
  3,
  'a binding pinned in place keeps the pairs it was given'
);

-- 19.
select is (
  (select data_type from public.dataset_columns where id = 'd2460005-0000-4000-8000-000000000005'::uuid),
  'bigint'::public.datasets__ava_data_type,
  'a pinned encoded column keeps its type'
);

-- A save that leaves the hospitalized entry out.

-- 20.
select lives_ok (
  $t19$
  select pg_temp.save_as_owner (
    '[
      {"id":"d2500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true},{"code":"U","label":"Not stated","accepted_spellings":[],"is_missing":true}]},
      {"id":"d2500003-0000-4000-8000-000000000003","name":"Y/N/U","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false},{"code":"U","label":"Unknown","accepted_spellings":[],"is_missing":true}]},
      {"id":"d2500005-0000-4000-8000-000000000005","name":"Sex (m/f/x)","is_ordered":false,"pairs":[{"code":"m","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"f","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"x","label":"Other","accepted_spellings":[],"is_missing":false}]}
    ]'::jsonb,
    jsonb_build_array(
      pg_temp.entry ('d2600001-0000-4000-8000-000000000001'::uuid, 'sex', 0, '[{"code_list_id":"d2500001-0000-4000-8000-000000000001","is_primary":true},{"code_list_id":"d2500005-0000-4000-8000-000000000005","is_primary":false}]'::jsonb)
    )
  );
  $t19$,
  'the owner saves the dictionary without the hospitalized entry'
);

-- 21.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings where id = 'd2470006-0000-4000-8000-000000000006'::uuid),
  0,
  'a deleted entry takes its reference bindings with it'
);

-- 22.
select results_eq (
  $q$
    select entry_id, pinned_pairs is not null
    from public.dataset_columns__dictionary_bindings
    where id = 'd2470003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$ values (null::uuid, true) $q$,
  'a deleted entry leaves its pinned convert binding converting'
);

-- Deleting the dictionary.

-- 23.
select lives_ok (
  $t22$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d2000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'd2400001-0000-4000-8000-000000000001'::uuid;
  $t22$,
  'the owner deletes the dictionary'
);
reset role;

-- 24.
select is (
  (
    select count(*)::int
    from public.dataset_columns__dictionary_bindings
    where mode = 'reference' and workspace_id = 'd2100001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'a deleted dictionary takes its reference bindings with it'
);

-- 25. The dictionary's trigger runs before the cascade clears code_list_id,
-- so the binding is pinned to Sex (1/2/9) as it stood, U included.
select results_eq (
  $q$
    select dictionary_id, entry_id, code_list_id, jsonb_array_length(pinned_pairs), pinned_is_ordered
    from public.dataset_columns__dictionary_bindings
    where id = 'd2470001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values (null::uuid, null::uuid, null::uuid, 4, false) $q$,
  'a live binding of a deleted dictionary is pinned before its links are cleared'
);

-- 26.
select is (
  (select jsonb_array_length(pinned_pairs) from public.dataset_columns__dictionary_bindings where id = 'd2470002-0000-4000-8000-000000000002'::uuid),
  4,
  'every live binding of the dictionary is pinned'
);

-- 27.
select is (
  (select jsonb_array_length(pinned_pairs) from public.dataset_columns__dictionary_bindings where id = 'd2470004-0000-4000-8000-000000000004'::uuid),
  3,
  'a binding pinned in place is not re-pinned when its dictionary goes'
);

-- 28.
select is (
  (select data_type from public.dataset_columns where id = 'd2460001-0000-4000-8000-000000000001'::uuid),
  'varchar'::public.datasets__ava_data_type,
  'a pinned column keeps converting, so its type stays'
);

select * from finish ();

rollback;
