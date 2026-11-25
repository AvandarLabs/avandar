\set ON_ERROR_STOP on

/**
 * `rpc_dataset_columns__reapply_dictionary` re-pins one dictionary's
 * pinned convert bindings on one dataset to the current pairs and version,
 * and re-derives their columns' types. Live bindings, reference bindings,
 * and a pinned binding whose code list is gone are left alone. Only an
 * editor of the dataset who reads dictionaries can call it.
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

-- Re-applies one dictionary as the given user and returns its hint.
create function pg_temp.reapply_as (p_user_id uuid, p_dataset_id uuid, p_dictionary_id uuid) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_dataset_columns__reapply_dictionary (%L::uuid, %L::uuid);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dataset_id,
    p_dictionary_id
  ));
end;
$$;

-- Re-applies one dictionary as the given user and returns what the RPC
-- returns.
create function pg_temp.reapply_count_as (p_user_id uuid, p_dataset_id uuid, p_dictionary_id uuid) returns integer language plpgsql as $$
declare
  v_num_repinned integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_num_repinned := public.rpc_dataset_columns__reapply_dictionary (p_dataset_id, p_dictionary_id);
  reset role;
  return v_num_repinned;
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('d5000001-0000-4000-8000-000000000001'::uuid, 'conv_reapply_owner@test.dev', 'authenticated', 'authenticated'),
  ('d5000002-0000-4000-8000-000000000002'::uuid, 'conv_reapply_viewer@test.dev', 'authenticated', 'authenticated'),
  ('d5000003-0000-4000-8000-000000000003'::uuid, 'conv_reapply_outsider@test.dev', 'authenticated', 'authenticated'),
  ('d5000004-0000-4000-8000-000000000004'::uuid, 'conv_reapply_shared@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'conv reapply ws', 'conv-reapply-ws'),
  ('d5100002-0000-4000-8000-000000000002'::uuid, 'd5000003-0000-4000-8000-000000000003'::uuid, 'conv reapply other', 'conv-reapply-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d5200001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid),
  ('d5200002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000002-0000-4000-8000-000000000002'::uuid),
  ('d5200003-0000-4000-8000-000000000003'::uuid, 'd5100002-0000-4000-8000-000000000002'::uuid, 'd5000003-0000-4000-8000-000000000003'::uuid),
  ('d5200004-0000-4000-8000-000000000004'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d5300001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d5300002-0000-4000-8000-000000000002'::uuid, 'd5000002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('d5300003-0000-4000-8000-000000000003'::uuid, 'd5000003-0000-4000-8000-000000000003'::uuid, 'd5100002-0000-4000-8000-000000000002'::uuid, 'd5200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider'),
  ('d5300004-0000-4000-8000-000000000004'::uuid, 'd5000004-0000-4000-8000-000000000004'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5200004-0000-4000-8000-000000000004'::uuid, 'Shared editor', 'Shared editor')
on conflict (id) do nothing;

-- The viewer gets Global Viewer. The shared editor has no app role, only a
-- share on Kings, so they cannot read dictionaries.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'd5100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'd5000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('d5450001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('d5450002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5300001-0000-4000-8000-000000000001'::uuid, 'Bronx (labeled)', 'virtual'::public.datasets__source_type),
  ('d5450003-0000-4000-8000-000000000003'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
values ('d5450002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d5450003-0000-4000-8000-000000000003"', 'd5450003-0000-4000-8000-000000000003'::uuid);

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values ('d5100001-0000-4000-8000-000000000001'::uuid, 'dataset'::public.resource_type, 'd5450001-0000-4000-8000-000000000001'::uuid, 'user'::public.share_principal_type, 'd5000004-0000-4000-8000-000000000004'::uuid, 'editor'::public.role_level);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('d5460001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d5460002-0000-4000-8000-000000000002'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'sex_label', 'sex_label', 'VARCHAR', 'VARCHAR', 'bigint', 1),
  ('d5460003-0000-4000-8000-000000000003'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'hosp', 'hosp', 'VARCHAR', 'VARCHAR', 'varchar', 2),
  ('d5460004-0000-4000-8000-000000000004'::uuid, 'd5450002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('d5400001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('d5400002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5000001-0000-4000-8000-000000000001'::uuid, 'd5300001-0000-4000-8000-000000000001'::uuid, 'Other codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('d5500001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]'::jsonb),
  ('d5500002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'Yes/No', '[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('d5600001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('d5600002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'hospitalized', 'categorical', 1);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('d5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600001-0000-4000-8000-000000000001'::uuid, 'd5500001-0000-4000-8000-000000000001'::uuid, true),
  ('d5100001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600002-0000-4000-8000-000000000002'::uuid, 'd5500002-0000-4000-8000-000000000002'::uuid, true);

-- Kings was converted in place at version 1; Bronx (labeled) converts live.
insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, mode, direction, applied_dictionary_version, pinned_pairs, pinned_is_ordered, replaced_data_type)
values
  ('d5470001-0000-4000-8000-000000000001'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5460001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600001-0000-4000-8000-000000000001'::uuid, 'd5500001-0000-4000-8000-000000000001'::uuid, 'convert', 'decode', 1, (select pairs from public.data_dictionaries__code_lists where id = 'd5500001-0000-4000-8000-000000000001'::uuid), false, 'bigint'),
  ('d5470002-0000-4000-8000-000000000002'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5460002-0000-4000-8000-000000000002'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600001-0000-4000-8000-000000000001'::uuid, 'd5500001-0000-4000-8000-000000000001'::uuid, 'convert', 'encode', 1, (select pairs from public.data_dictionaries__code_lists where id = 'd5500001-0000-4000-8000-000000000001'::uuid), false, 'varchar'),
  ('d5470003-0000-4000-8000-000000000003'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5460003-0000-4000-8000-000000000003'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600002-0000-4000-8000-000000000002'::uuid, 'd5500002-0000-4000-8000-000000000002'::uuid, 'convert', 'decode', 1, (select pairs from public.data_dictionaries__code_lists where id = 'd5500002-0000-4000-8000-000000000002'::uuid), false, 'varchar'),
  ('d5470004-0000-4000-8000-000000000004'::uuid, 'd5100001-0000-4000-8000-000000000001'::uuid, 'd5450002-0000-4000-8000-000000000002'::uuid, 'd5460004-0000-4000-8000-000000000004'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid, 'd5600001-0000-4000-8000-000000000001'::uuid, 'd5500001-0000-4000-8000-000000000001'::uuid, 'convert', 'decode', 1, null, null, 'bigint');

-- Version 2 adds the code U to Sex (1/2/9) and replaces Yes/No with Y/N/U.
do $do$
begin
  perform set_config('request.jwt.claims', '{"sub":"d5000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  perform public.rpc_data_dictionaries__save (
    'd5400001-0000-4000-8000-000000000001'::uuid,
    '[
      {"id":"d5500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true},{"code":"U","label":"Not stated","accepted_spellings":[],"is_missing":true}]},
      {"id":"d5500003-0000-4000-8000-000000000003","name":"Y/N/U","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"No","accepted_spellings":[],"is_missing":false},{"code":"U","label":"Unknown","accepted_spellings":[],"is_missing":true}]}
    ]'::jsonb,
    '[
      {"id":"d5600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"d5500001-0000-4000-8000-000000000001","is_primary":true}]},
      {"id":"d5600002-0000-4000-8000-000000000002","name":"hospitalized","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[{"code_list_id":"d5500003-0000-4000-8000-000000000003","is_primary":true}]}
    ]'::jsonb
  );
  reset role;
end;
$do$;

select plan (13);

-- 1.
select has_function ('public', 'rpc_dataset_columns__reapply_dictionary', array['uuid', 'uuid']::name[], 'the re-apply takes a dataset and a dictionary');

-- 2.
select is (
  pg_temp.reapply_as ('d5000002-0000-4000-8000-000000000002'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  'dataset_editor_required',
  'a viewer cannot re-apply'
);
reset role;

-- 3.
select is (
  pg_temp.reapply_as ('d5000003-0000-4000-8000-000000000003'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  'dataset_editor_required',
  'a user outside the workspace cannot re-apply'
);
reset role;

-- 4.
select is (
  pg_temp.reapply_as ('d5000001-0000-4000-8000-000000000001'::uuid, 'd545ffff-0000-4000-8000-00000000ffff'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  'dataset_editor_required',
  'a dataset that does not exist is refused like a forbidden one'
);
reset role;

-- 5.
select is (
  pg_temp.reapply_as ('d5000004-0000-4000-8000-000000000004'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  'dictionary_viewer_required',
  'an editor of the dataset who cannot read dictionaries cannot re-apply'
);
reset role;

-- 6.
select is (
  pg_temp.reapply_as ('d5000001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400002-0000-4000-8000-000000000002'::uuid),
  'nothing_to_reapply',
  'a dictionary nothing on the dataset is pinned to has nothing to re-apply'
);
reset role;

-- 7.
select is (
  pg_temp.reapply_as ('d5000001-0000-4000-8000-000000000001'::uuid, 'd5450002-0000-4000-8000-000000000002'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  'nothing_to_reapply',
  'a linked dataset follows the dictionary, so it has nothing to re-apply'
);
reset role;

-- 8.
select is (
  pg_temp.reapply_count_as ('d5000001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  2,
  'the owner re-pins the two bindings whose code list is still there'
);

-- 9.
select results_eq (
  $q$
    select jsonb_array_length(pinned_pairs), applied_dictionary_version
    from public.dataset_columns__dictionary_bindings
    where id = 'd5470001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values (4, 2) $q$,
  'a re-pinned binding gets the current pairs and version'
);

-- 10.
select results_eq (
  $q$
    select name, data_type::text
    from public.dataset_columns
    where dataset_id = 'd5450001-0000-4000-8000-000000000001'::uuid
    order by column_idx
  $q$,
  $q$ values ('GENDER', 'varchar'), ('sex_label', 'varchar'), ('hosp', 'varchar') $q$,
  'a re-pinned encoded column becomes text once its pairs include a text code'
);

-- 11.
select results_eq (
  $q$
    select jsonb_array_length(pinned_pairs), applied_dictionary_version, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'd5470003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$ values (2, 1, null::uuid) $q$,
  'a pinned binding whose code list was deleted is not re-pinned'
);

-- 12.
select is (
  (select pinned_pairs from public.dataset_columns__dictionary_bindings where id = 'd5470004-0000-4000-8000-000000000004'::uuid),
  null::jsonb,
  'a live binding stays live'
);

-- 13.
select is (
  pg_temp.reapply_count_as ('d5000001-0000-4000-8000-000000000001'::uuid, 'd5450001-0000-4000-8000-000000000001'::uuid, 'd5400001-0000-4000-8000-000000000001'::uuid),
  2,
  're-applying again re-pins the same bindings'
);

select * from finish ();

rollback;
