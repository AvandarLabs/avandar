\set ON_ERROR_STOP on

/**
 * `rpc_crosswalks__save_combined_dataset` creates a crosswalk's combined
 * dataset, or updates it: its name, `raw_sql`, columns reconciled by name
 * ignoring case, and the reference bindings of its governed columns. It
 * records `output_dataset_id`, `compiled_at`, and `compiled_code_lists`.
 * Only a Data Sources editor can call it; creating also needs workspace
 * admin, and updating needs editor rights on the dataset. Every refusal
 * raises a stable `hint` and changes nothing.
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

-- The first combine's payload, one function per argument.
create function pg_temp.base_sql () returns text language sql as $$
  select 'SELECT * FROM "c5450009-0000-4000-8000-000000000009"';
$$;

create function pg_temp.base_columns () returns jsonb language sql as $$
  select '[
    {"name":"source_dataset","data_type":"varchar"},
    {"name":"case_id","data_type":"varchar"},
    {"name":"sex","data_type":"varchar"},
    {"name":"outcome","data_type":"varchar"}
  ]'::jsonb;
$$;

create function pg_temp.base_bindings () returns jsonb language sql as $$
  select '[
    {"column_name":"sex","dictionary_id":"c5400001-0000-4000-8000-000000000001","entry_id":"c5600001-0000-4000-8000-000000000001","code_list_id":"c5500001-0000-4000-8000-000000000001","direction":"encode"},
    {"column_name":"outcome","dictionary_id":"c5400001-0000-4000-8000-000000000001","entry_id":"c5600002-0000-4000-8000-000000000002","code_list_id":"c5500002-0000-4000-8000-000000000002","direction":"encode"}
  ]'::jsonb;
$$;

create function pg_temp.base_code_lists () returns jsonb language sql as $$
  select '[
    {"code_list_id":"c5500001-0000-4000-8000-000000000001","fingerprint":"p1.00000000000000a1"},
    {"code_list_id":"c5500002-0000-4000-8000-000000000002","fingerprint":"p1.00000000000000b2"}
  ]'::jsonb;
$$;

-- Runs one combine and returns its hint, or 'no error'. By default the
-- workspace owner creates the combined dataset of the crosswalk under
-- test.
create function pg_temp.combine (
  p_user_id uuid default 'c5000001-0000-4000-8000-000000000001'::uuid,
  p_crosswalk_id uuid default 'c5700001-0000-4000-8000-000000000001'::uuid,
  p_dataset_id uuid default 'c5450001-0000-4000-8000-000000000001'::uuid,
  p_dataset_name text default 'Kings and Queens',
  p_raw_sql text default pg_temp.base_sql (),
  p_columns jsonb default pg_temp.base_columns (),
  p_bindings jsonb default pg_temp.base_bindings (),
  p_compiled_code_lists jsonb default pg_temp.base_code_lists ()
) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_crosswalks__save_combined_dataset (%L::uuid, %L::uuid, %L, %L, %L::jsonb, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_crosswalk_id,
    p_dataset_id,
    p_dataset_name,
    p_raw_sql,
    p_columns,
    p_bindings,
    p_compiled_code_lists
  ));
end;
$$;

-- Creates the combined dataset as the workspace owner and returns what
-- the RPC returns.
create function pg_temp.create_as_owner () returns uuid language plpgsql as $$
declare
  v_dataset_id uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"c5000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  set local role authenticated;
  v_dataset_id := public.rpc_crosswalks__save_combined_dataset (
    'c5700001-0000-4000-8000-000000000001'::uuid,
    'c5450001-0000-4000-8000-000000000001'::uuid,
    'Kings and Queens',
    pg_temp.base_sql (),
    pg_temp.base_columns (),
    pg_temp.base_bindings (),
    pg_temp.base_code_lists ()
  );
  reset role;
  return v_dataset_id;
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('c5000001-0000-4000-8000-000000000001'::uuid, 'cw_combine_owner@test.dev', 'authenticated', 'authenticated'),
  ('c5000002-0000-4000-8000-000000000002'::uuid, 'cw_combine_editor@test.dev', 'authenticated', 'authenticated'),
  ('c5000003-0000-4000-8000-000000000003'::uuid, 'cw_combine_viewer@test.dev', 'authenticated', 'authenticated'),
  ('c5000004-0000-4000-8000-000000000004'::uuid, 'cw_combine_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('c5100001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'crosswalk combine ws', 'crosswalk-combine-ws'),
  ('c5100002-0000-4000-8000-000000000002'::uuid, 'c5000004-0000-4000-8000-000000000004'::uuid, 'crosswalk combine other', 'crosswalk-combine-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('c5200001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid),
  ('c5200002-0000-4000-8000-000000000002'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000002-0000-4000-8000-000000000002'::uuid),
  ('c5200003-0000-4000-8000-000000000003'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000003-0000-4000-8000-000000000003'::uuid),
  ('c5200004-0000-4000-8000-000000000004'::uuid, 'c5100002-0000-4000-8000-000000000002'::uuid, 'c5000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('c5300001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('c5300002-0000-4000-8000-000000000002'::uuid, 'c5000002-0000-4000-8000-000000000002'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5200002-0000-4000-8000-000000000002'::uuid, 'Editor', 'Editor'),
  ('c5300003-0000-4000-8000-000000000003'::uuid, 'c5000003-0000-4000-8000-000000000003'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5200003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer'),
  ('c5300004-0000-4000-8000-000000000004'::uuid, 'c5000004-0000-4000-8000-000000000004'::uuid, 'c5100002-0000-4000-8000-000000000002'::uuid, 'c5200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The editor edits every dataset and crosswalk but does not manage the
-- workspace, so they cannot add a dataset. The owner can.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'c5100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'c5000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'c5000003-0000-4000-8000-000000000003'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- NYS codes is at version 3. A second dictionary in the workspace, and
-- one in another workspace, hold entries a binding must not mix up.
insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name, version)
values
  ('c5400001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5300001-0000-4000-8000-000000000001'::uuid, 'NYS codes', 3),
  ('c5400002-0000-4000-8000-000000000002'::uuid, 'c5100002-0000-4000-8000-000000000002'::uuid, 'c5000004-0000-4000-8000-000000000004'::uuid, 'c5300004-0000-4000-8000-000000000004'::uuid, 'Other workspace codes', 1),
  ('c5400003-0000-4000-8000-000000000003'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5300001-0000-4000-8000-000000000001'::uuid, 'Second dictionary', 1);

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('c5500001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('c5500002-0000-4000-8000-000000000002'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'Outcome', '[{"code":"R","label":"Recovered","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('c5500009-0000-4000-8000-000000000009'::uuid, 'c5100002-0000-4000-8000-000000000002'::uuid, 'c5400002-0000-4000-8000-000000000002'::uuid, 'Sex', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('c5600001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('c5600002-0000-4000-8000-000000000002'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'outcome', 'categorical', 1),
  ('c5600009-0000-4000-8000-000000000009'::uuid, 'c5100002-0000-4000-8000-000000000002'::uuid, 'c5400002-0000-4000-8000-000000000002'::uuid, 'sex', 'categorical', 0);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'c5600001-0000-4000-8000-000000000001'::uuid, 'c5500001-0000-4000-8000-000000000001'::uuid, true),
  ('c5100001-0000-4000-8000-000000000001'::uuid, 'c5400001-0000-4000-8000-000000000001'::uuid, 'c5600002-0000-4000-8000-000000000002'::uuid, 'c5500002-0000-4000-8000-000000000002'::uuid, true),
  ('c5100002-0000-4000-8000-000000000002'::uuid, 'c5400002-0000-4000-8000-000000000002'::uuid, 'c5600009-0000-4000-8000-000000000009'::uuid, 'c5500009-0000-4000-8000-000000000009'::uuid, true);

insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name)
values ('c5700001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid, 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5300001-0000-4000-8000-000000000001'::uuid, 'Kings and Queens');

select plan (29);

-- 1.
select has_function (
  'public',
  'rpc_crosswalks__save_combined_dataset',
  array['uuid', 'uuid', 'text', 'text', 'jsonb', 'jsonb', 'jsonb']::name[],
  'the combine takes the crosswalk, the dataset id and name, its SQL, its columns, its bindings, and the code lists it embedded'
);

-- Refusals. None of them changes anything.

-- 2.
select is (
  pg_temp.combine (p_user_id => 'c5000003-0000-4000-8000-000000000003'::uuid),
  'crosswalk_editor_required',
  'a Data Sources viewer cannot combine'
);
reset role;

-- 3.
select is (
  pg_temp.combine (p_user_id => 'c5000004-0000-4000-8000-000000000004'::uuid),
  'crosswalk_editor_required',
  'a user outside the workspace cannot combine'
);
reset role;

-- 4.
select is (
  pg_temp.combine (p_crosswalk_id => 'c570ffff-0000-4000-8000-00000000ffff'::uuid),
  'crosswalk_editor_required',
  'a crosswalk that does not exist is refused like a forbidden one'
);
reset role;

-- 5.
select is (
  pg_temp.combine (p_dataset_name => '   '),
  'combined_dataset_name_required',
  'the combined dataset needs a name'
);
reset role;

-- 6.
select is (
  pg_temp.combine (p_columns => '[]'::jsonb),
  'combined_columns_invalid',
  'the combined dataset needs at least one column'
);
reset role;

-- 7.
select is (
  pg_temp.combine (p_columns => jsonb_set(pg_temp.base_columns (), '{3,name}', '"CASE_ID"')),
  'combined_columns_invalid',
  'two columns cannot share a name ignoring case'
);
reset role;

-- 8.
select is (
  pg_temp.combine (p_columns => jsonb_set(pg_temp.base_columns (), '{1,data_type}', '"integer"')),
  'combined_columns_invalid',
  'every column has a known type'
);
reset role;

-- 9.
select is (
  pg_temp.combine (p_bindings => jsonb_set(pg_temp.base_bindings (), '{0,direction}', '"both"')),
  'combined_columns_invalid',
  'a binding decodes or encodes'
);
reset role;

-- 10.
select is (
  pg_temp.combine (p_bindings => jsonb_set(pg_temp.base_bindings (), '{0,column_name}', '"gender"')),
  'binding_column_missing',
  'a binding names a column of the combined dataset'
);
reset role;

-- 11.
select is (
  pg_temp.combine (
    p_bindings => jsonb_set(
      jsonb_set(
        jsonb_set(pg_temp.base_bindings (), '{0,dictionary_id}', '"c5400002-0000-4000-8000-000000000002"'),
        '{0,entry_id}',
        '"c5600009-0000-4000-8000-000000000009"'
      ),
      '{0,code_list_id}',
      '"c5500009-0000-4000-8000-000000000009"'
    )
  ),
  'binding_not_in_workspace',
  'a binding cannot use a dictionary from another workspace'
);
reset role;

-- 12.
select is (
  pg_temp.combine (p_bindings => jsonb_set(pg_temp.base_bindings (), '{0,dictionary_id}', '"c5400003-0000-4000-8000-000000000003"')),
  'binding_not_in_workspace',
  'a binding''s entry belongs to its dictionary'
);
reset role;

-- 13.
select is (
  pg_temp.combine (p_bindings => jsonb_set(pg_temp.base_bindings (), '{0,code_list_id}', '"c5500002-0000-4000-8000-000000000002"')),
  'binding_not_in_workspace',
  'a binding''s code list is one its entry uses'
);
reset role;

-- 14.
select is (
  pg_temp.combine (p_user_id => 'c5000002-0000-4000-8000-000000000002'::uuid),
  'dataset_creator_required',
  'a Data Sources editor who cannot add datasets cannot create the combined dataset'
);
reset role;

-- 15.
select is (
  format(
    'datasets=%s output=%s compiled=%s',
    (select count(*) from public.datasets where id = 'c5450001-0000-4000-8000-000000000001'::uuid),
    (select output_dataset_id from public.crosswalks where id = 'c5700001-0000-4000-8000-000000000001'::uuid),
    (select compiled_at from public.crosswalks where id = 'c5700001-0000-4000-8000-000000000001'::uuid)
  ),
  'datasets=0 output= compiled=',
  'refused combines create nothing and record nothing'
);

-- Creating.

-- 16.
select is (
  pg_temp.create_as_owner (),
  'c5450001-0000-4000-8000-000000000001'::uuid,
  'the workspace owner creates the combined dataset, and the RPC returns its id'
);

-- 17.
select results_eq (
  $q$
    select name, source_type::text, owner_id, workspace_id
    from public.datasets
    where id = 'c5450001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values ('Kings and Queens', 'virtual', 'c5000001-0000-4000-8000-000000000001'::uuid, 'c5100001-0000-4000-8000-000000000001'::uuid) $q$,
  'the combined dataset is a virtual dataset the caller owns'
);

-- 18.
select results_eq (
  $q$
    select raw_sql, linked_source_dataset_id is null
    from public.datasets__virtual
    where dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values ('SELECT * FROM "c5450009-0000-4000-8000-000000000009"', true) $q$,
  'it runs the compiled SQL and is not a linked dataset'
);

-- 19.
select results_eq (
  $q$
    select original_name, name, original_data_type, detected_data_type::text, data_type::text, column_idx
    from public.dataset_columns
    where dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid
    order by column_idx
  $q$,
  $q$
    values
      ('source_dataset', 'source_dataset', 'VARCHAR', 'VARCHAR', 'varchar', 0),
      ('case_id', 'case_id', 'VARCHAR', 'VARCHAR', 'varchar', 1),
      ('sex', 'sex', 'VARCHAR', 'VARCHAR', 'varchar', 2),
      ('outcome', 'outcome', 'VARCHAR', 'VARCHAR', 'varchar', 3)
  $q$,
  'its columns are the payload''s, in order, with their types'
);

-- 20.
select results_eq (
  $q$
    select dc.name, b.mode::text, b.direction::text, b.dictionary_id, b.entry_id, b.code_list_id, b.applied_dictionary_version
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid
    order by dc.name
  $q$,
  $q$
    values
      ('outcome', 'reference', 'encode', 'c5400001-0000-4000-8000-000000000001'::uuid, 'c5600002-0000-4000-8000-000000000002'::uuid, 'c5500002-0000-4000-8000-000000000002'::uuid, 3),
      ('sex', 'reference', 'encode', 'c5400001-0000-4000-8000-000000000001'::uuid, 'c5600001-0000-4000-8000-000000000001'::uuid, 'c5500001-0000-4000-8000-000000000001'::uuid, 3)
  $q$,
  'its governed columns get reference bindings at the dictionary''s version'
);

-- 21.
select results_eq (
  $q$
    select output_dataset_id, compiled_at is not null, compiled_code_lists
    from public.crosswalks
    where id = 'c5700001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$
    values (
      'c5450001-0000-4000-8000-000000000001'::uuid,
      true,
      '[{"code_list_id":"c5500001-0000-4000-8000-000000000001","fingerprint":"p1.00000000000000a1"},{"code_list_id":"c5500002-0000-4000-8000-000000000002","fingerprint":"p1.00000000000000b2"}]'::jsonb
    )
  $q$,
  'the crosswalk records its combined dataset, when it was compiled, and the lists it embedded'
);

-- Updating.

-- 22.
select is (
  pg_temp.combine (p_dataset_id => 'c5450002-0000-4000-8000-000000000002'::uuid),
  'combined_dataset_mismatch',
  'an update names the crosswalk''s own combined dataset'
);
reset role;

create temporary table cw_columns_before as
select id, name
from public.dataset_columns
where dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid;

-- 23. case_id comes back as CASE_ID, sex turns into codes, outcome goes,
-- county is new, and sex is now bound to decode.
select is (
  pg_temp.combine (
    p_dataset_name => 'Kings and Queens (v2)',
    p_raw_sql => 'SELECT * FROM "c5450009-0000-4000-8000-000000000009" WHERE true',
    p_columns => '[{"name":"source_dataset","data_type":"varchar"},{"name":"CASE_ID","data_type":"varchar"},{"name":"sex","data_type":"bigint"},{"name":"county","data_type":"varchar"}]'::jsonb,
    p_bindings => '[{"column_name":"SEX","dictionary_id":"c5400001-0000-4000-8000-000000000001","entry_id":"c5600001-0000-4000-8000-000000000001","code_list_id":"c5500001-0000-4000-8000-000000000001","direction":"decode"}]'::jsonb,
    p_compiled_code_lists => '[{"code_list_id":"c5500001-0000-4000-8000-000000000001","fingerprint":"p1.00000000000000c3"}]'::jsonb
  ),
  'no error',
  'the owner updates the combined dataset'
);
reset role;

-- 24.
select results_eq (
  $q$
    select d.name, v.raw_sql
    from public.datasets d
    join public.datasets__virtual v on v.dataset_id = d.id
    where d.id = 'c5450001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values ('Kings and Queens (v2)', 'SELECT * FROM "c5450009-0000-4000-8000-000000000009" WHERE true') $q$,
  'the update renames the dataset and replaces its SQL'
);

-- 25.
select results_eq (
  $q$
    select
      dc.name,
      dc.original_name,
      dc.data_type::text,
      dc.detected_data_type::text,
      dc.column_idx,
      (select b.name from cw_columns_before b where b.id = dc.id)
    from public.dataset_columns dc
    where dc.dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid
    order by dc.column_idx
  $q$,
  $q$
    values
      ('source_dataset', 'source_dataset', 'varchar', 'VARCHAR', 0, 'source_dataset'),
      ('CASE_ID', 'CASE_ID', 'varchar', 'VARCHAR', 1, 'case_id'),
      ('sex', 'sex', 'bigint', 'BIGINT', 2, 'sex'),
      ('county', 'county', 'varchar', 'VARCHAR', 3, null::text)
  $q$,
  'columns matching by name ignoring case keep their ids, new ones are added, and removed ones are gone'
);

-- 26.
select results_eq (
  $q$
    select
      dc.name,
      b.mode::text,
      b.direction::text,
      b.code_list_id,
      b.applied_dictionary_version,
      (select bf.name from cw_columns_before bf where bf.id = dc.id)
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'c5450001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$ values ('sex', 'reference', 'decode', 'c5500001-0000-4000-8000-000000000001'::uuid, 3, 'sex') $q$,
  'the bindings are replaced whole, on the kept column, and the removed column''s binding is gone'
);

-- 27.
select results_eq (
  $q$
    select output_dataset_id, compiled_code_lists
    from public.crosswalks
    where id = 'c5700001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$
    values (
      'c5450001-0000-4000-8000-000000000001'::uuid,
      '[{"code_list_id":"c5500001-0000-4000-8000-000000000001","fingerprint":"p1.00000000000000c3"}]'::jsonb
    )
  $q$,
  'the update records the code lists it embedded now'
);

-- The owner restricts the combined dataset, so the editor's app role no
-- longer reaches it.
update public.datasets
set is_restricted = true
where id = 'c5450001-0000-4000-8000-000000000001'::uuid;

-- 28.
select is (
  pg_temp.combine (
    p_user_id => 'c5000002-0000-4000-8000-000000000002'::uuid,
    p_dataset_name => 'Editor rename'
  ),
  'dataset_editor_required',
  'a crosswalk editor who cannot edit the combined dataset cannot update it'
);
reset role;

-- 29.
select is (
  (select name from public.datasets where id = 'c5450001-0000-4000-8000-000000000001'::uuid),
  'Kings and Queens (v2)',
  'the refused update left the combined dataset as it was'
);

select * from finish ();

rollback;
