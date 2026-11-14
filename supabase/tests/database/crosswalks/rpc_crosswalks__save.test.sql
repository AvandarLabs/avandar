\set ON_ERROR_STOP on

/**
 * `rpc_crosswalks__save` replaces one crosswalk's settings, columns,
 * layouts, dataset memberships, and mappings in one transaction. Only a
 * Data Sources editor can call it; every refusal raises a stable `hint`
 * and changes nothing. Ids stay stable across saves, a dropped layout
 * takes its mappings with it, and a membership whose dataset the caller
 * cannot view survives every save.
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

-- The first save's payload, one function per argument. Tests change one
-- piece with `jsonb_set` or `||` and pass the rest as they are.
create function pg_temp.base_settings () returns jsonb language sql as $$
  select jsonb_build_object(
    'name', 'Kings and Queens',
    'description', 'Every borough line list on one layout.',
    'codes_output_as', 'labels',
    'adds_source_column', true
  );
$$;

create function pg_temp.base_columns () returns jsonb language sql as $$
  select '[
    {"id":"c4720001-0000-4000-8000-000000000001","name":"case_id","position":0,"data_type":"varchar","entry_id":null},
    {"id":"c4720002-0000-4000-8000-000000000002","name":"sex","position":1,"data_type":"varchar","entry_id":"c4600001-0000-4000-8000-000000000001"},
    {"id":"c4720003-0000-4000-8000-000000000003","name":"onset","position":2,"data_type":"date","entry_id":null}
  ]'::jsonb;
$$;

create function pg_temp.base_layouts () returns jsonb language sql as $$
  select '[
    {"id":"c4710001-0000-4000-8000-000000000001","signature":"l1.0000000000000001","column_names":["case_id","sex","onset"],"is_reference":true,"status":"mapped"},
    {"id":"c4710002-0000-4000-8000-000000000002","signature":"l1.0000000000000002","column_names":["CaseNo","GENDER","onset_dt"],"is_reference":false,"status":"to_do"},
    {"id":"c4710003-0000-4000-8000-000000000003","signature":"l1.0000000000000003","column_names":["caseno"],"is_reference":false,"status":"review"}
  ]'::jsonb;
$$;

create function pg_temp.base_datasets () returns jsonb language sql as $$
  select '[
    {"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710002-0000-4000-8000-000000000002"},
    {"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710002-0000-4000-8000-000000000002"},
    {"dataset_id":"c4450003-0000-4000-8000-000000000003","layout_id":"c4710001-0000-4000-8000-000000000001"}
  ]'::jsonb;
$$;

create function pg_temp.base_mappings () returns jsonb language sql as $$
  select '[
    {"id":"c4730001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001","column_id":"c4720001-0000-4000-8000-000000000001","fill":{"version":1,"kind":"column","source_column":"case_id","convert":null,"code_list_id":null,"holds_labels":false},"status":"confirmed","confidence":null,"reason":null},
    {"id":"c4730002-0000-4000-8000-000000000002","layout_id":"c4710002-0000-4000-8000-000000000002","column_id":"c4720001-0000-4000-8000-000000000001","fill":{"version":1,"kind":"column","source_column":"CaseNo","convert":null,"code_list_id":null,"holds_labels":false},"status":"suggested","confidence":0.92,"reason":"name_and_type"},
    {"id":"c4730003-0000-4000-8000-000000000003","layout_id":"c4710002-0000-4000-8000-000000000002","column_id":"c4720002-0000-4000-8000-000000000002","fill":{"version":1,"kind":"column","source_column":"GENDER","convert":null,"code_list_id":"c4500001-0000-4000-8000-000000000001","holds_labels":false},"status":"confirmed","confidence":null,"reason":null},
    {"id":"c4730004-0000-4000-8000-000000000004","layout_id":"c4710003-0000-4000-8000-000000000003","column_id":"c4720001-0000-4000-8000-000000000001","fill":{"version":1,"kind":"column","source_column":"caseno","convert":null,"code_list_id":null,"holds_labels":false},"status":"suggested","confidence":0.8,"reason":"similar_layout"},
    {"id":"c4730005-0000-4000-8000-000000000005","layout_id":"c4710002-0000-4000-8000-000000000002","column_id":"c4720003-0000-4000-8000-000000000003","fill":{"version":1,"kind":"column","source_column":"onset_dt","convert":{"kind":"parse_date","format":"%m/%d/%Y"},"code_list_id":null,"holds_labels":false},"status":"confirmed","confidence":null,"reason":null}
  ]'::jsonb;
$$;

-- Runs one save and returns its hint, or 'no error'. By default the
-- editor saves the first payload into the crosswalk under test.
create function pg_temp.save (
  p_settings jsonb default pg_temp.base_settings (),
  p_columns jsonb default pg_temp.base_columns (),
  p_layouts jsonb default pg_temp.base_layouts (),
  p_datasets jsonb default pg_temp.base_datasets (),
  p_mappings jsonb default pg_temp.base_mappings (),
  p_user_id uuid default 'c4000002-0000-4000-8000-000000000002'::uuid,
  p_crosswalk_id uuid default 'c4700001-0000-4000-8000-000000000001'::uuid
) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_crosswalks__save (%L::uuid, %L::jsonb, %L::jsonb, %L::jsonb, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_crosswalk_id,
    p_settings,
    p_columns,
    p_layouts,
    p_datasets,
    p_mappings
  ));
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('c4000001-0000-4000-8000-000000000001'::uuid, 'cw_save_owner@test.dev', 'authenticated', 'authenticated'),
  ('c4000002-0000-4000-8000-000000000002'::uuid, 'cw_save_editor@test.dev', 'authenticated', 'authenticated'),
  ('c4000003-0000-4000-8000-000000000003'::uuid, 'cw_save_viewer@test.dev', 'authenticated', 'authenticated'),
  ('c4000004-0000-4000-8000-000000000004'::uuid, 'cw_save_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'crosswalk save ws', 'crosswalk-save-ws'),
  ('c4100002-0000-4000-8000-000000000002'::uuid, 'c4000004-0000-4000-8000-000000000004'::uuid, 'crosswalk save other', 'crosswalk-save-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('c4200001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid),
  ('c4200002-0000-4000-8000-000000000002'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000002-0000-4000-8000-000000000002'::uuid),
  ('c4200003-0000-4000-8000-000000000003'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000003-0000-4000-8000-000000000003'::uuid),
  ('c4200004-0000-4000-8000-000000000004'::uuid, 'c4100002-0000-4000-8000-000000000002'::uuid, 'c4000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('c4300001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('c4300002-0000-4000-8000-000000000002'::uuid, 'c4000002-0000-4000-8000-000000000002'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4200002-0000-4000-8000-000000000002'::uuid, 'Editor', 'Editor'),
  ('c4300003-0000-4000-8000-000000000003'::uuid, 'c4000003-0000-4000-8000-000000000003'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4200003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer'),
  ('c4300004-0000-4000-8000-000000000004'::uuid, 'c4000004-0000-4000-8000-000000000004'::uuid, 'c4100002-0000-4000-8000-000000000002'::uuid, 'c4200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The editor gets Global Editor and the viewer Global Viewer. The owner
-- owns the workspace and every dataset in it.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'c4100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'c4000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'c4000003-0000-4000-8000-000000000003'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- Two Kings months, Queens, a restricted Bronx list the editor cannot
-- view, and a dataset in another workspace.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('c4450001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Kings line list 2026-03', 'csv_file'::public.datasets__source_type, false),
  ('c4450002-0000-4000-8000-000000000002'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Kings line list 2026-04', 'csv_file'::public.datasets__source_type, false),
  ('c4450003-0000-4000-8000-000000000003'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Queens line list', 'csv_file'::public.datasets__source_type, false),
  ('c4450004-0000-4000-8000-000000000004'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type, true),
  ('c4450005-0000-4000-8000-000000000005'::uuid, 'c4100002-0000-4000-8000-000000000002'::uuid, 'c4000004-0000-4000-8000-000000000004'::uuid, 'c4300004-0000-4000-8000-000000000004'::uuid, 'Other workspace list', 'csv_file'::public.datasets__source_type, false),
  ('c4450006-0000-4000-8000-000000000006'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Kings and Queens (combined)', 'virtual'::public.datasets__source_type, false)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('c4400001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('c4400002-0000-4000-8000-000000000002'::uuid, 'c4100002-0000-4000-8000-000000000002'::uuid, 'c4000004-0000-4000-8000-000000000004'::uuid, 'c4300004-0000-4000-8000-000000000004'::uuid, 'Other workspace codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values ('c4500001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('c4600001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('c4600009-0000-4000-8000-000000000009'::uuid, 'c4100002-0000-4000-8000-000000000002'::uuid, 'c4400002-0000-4000-8000-000000000002'::uuid, 'sex', 'categorical', 0);

-- The crosswalk under test starts empty, last updated long ago, with a
-- combined dataset already (set here as the table owner, which the managed
-- column guard lets through). Another
-- crosswalk owns a layout, a column, and a mapping the first must not
-- take. A third starts empty and stays without layouts.
insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name, created_at, updated_at, output_dataset_id)
values
  ('c4700001-0000-4000-8000-000000000001'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000002-0000-4000-8000-000000000002'::uuid, 'c4300002-0000-4000-8000-000000000002'::uuid, 'Untitled crosswalk', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z', 'c4450006-0000-4000-8000-000000000006'::uuid),
  ('c4700002-0000-4000-8000-000000000002'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000001-0000-4000-8000-000000000001'::uuid, 'c4300001-0000-4000-8000-000000000001'::uuid, 'Another crosswalk', now(), now(), null),
  ('c4700003-0000-4000-8000-000000000003'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4000002-0000-4000-8000-000000000002'::uuid, 'c4300002-0000-4000-8000-000000000002'::uuid, 'Untitled crosswalk', now(), now(), null);

insert into public.crosswalks__layouts (id, workspace_id, crosswalk_id, signature, column_names, is_reference, status)
values ('c4710009-0000-4000-8000-000000000009'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4700002-0000-4000-8000-000000000002'::uuid, 'l1.0000000000000009', array['id'], true, 'mapped');

insert into public.crosswalks__columns (id, workspace_id, crosswalk_id, name, position, data_type)
values ('c4720009-0000-4000-8000-000000000009'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4700002-0000-4000-8000-000000000002'::uuid, 'id', 0, 'varchar');

insert into public.crosswalks__mappings (id, workspace_id, crosswalk_id, layout_id, column_id, fill, status)
values ('c4730009-0000-4000-8000-000000000009'::uuid, 'c4100001-0000-4000-8000-000000000001'::uuid, 'c4700002-0000-4000-8000-000000000002'::uuid, 'c4710009-0000-4000-8000-000000000009'::uuid, 'c4720009-0000-4000-8000-000000000009'::uuid, '{"version":1,"kind":"column","source_column":"id","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb, 'confirmed');

select plan (59);

-- 1.
select has_function (
  'public',
  'rpc_crosswalks__save',
  array['uuid', 'jsonb', 'jsonb', 'jsonb', 'jsonb', 'jsonb']::name[],
  'the save takes the crosswalk, its settings, and its four sets'
);

-- Refusals. None of them changes anything.

-- 2.
select is (
  pg_temp.save (p_user_id => 'c4000003-0000-4000-8000-000000000003'::uuid),
  'crosswalk_editor_required',
  'a Data Sources viewer cannot save a crosswalk'
);
reset role;

-- 3.
select is (
  pg_temp.save (p_user_id => 'c4000004-0000-4000-8000-000000000004'::uuid),
  'crosswalk_editor_required',
  'a user outside the workspace cannot save a crosswalk'
);
reset role;

-- 4.
select is (
  pg_temp.save (p_crosswalk_id => 'c470ffff-0000-4000-8000-00000000ffff'::uuid),
  'crosswalk_editor_required',
  'a crosswalk that does not exist is refused like a forbidden one'
);
reset role;

-- 5.
select is (
  pg_temp.save (p_columns => '{}'::jsonb),
  'crosswalk_payload_invalid',
  'the columns must be an array'
);
reset role;

-- 6.
select is (
  pg_temp.save (p_columns => '["case_id"]'::jsonb),
  'crosswalk_payload_invalid',
  'every column must be an object'
);
reset role;

-- 7.
select is (
  pg_temp.save (p_settings => pg_temp.base_settings () || '{"codes_output_as":"both"}'::jsonb),
  'crosswalk_payload_invalid',
  'codes come out as labels or codes'
);
reset role;

-- 8.
select is (
  pg_temp.save (p_columns => jsonb_set(pg_temp.base_columns (), '{2,id}', '"c4720001-0000-4000-8000-000000000001"')),
  'crosswalk_payload_invalid',
  'a column id cannot appear twice'
);
reset role;

-- 9.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{1,confidence}', '2')),
  'crosswalk_payload_invalid',
  'a confidence is between 0 and 1'
);
reset role;

-- 10.
select is (
  pg_temp.save (p_settings => pg_temp.base_settings () || '{"name":"   "}'::jsonb),
  'crosswalk_name_required',
  'a crosswalk needs a name'
);
reset role;

-- 11.
select is (
  pg_temp.save (p_columns => jsonb_set(pg_temp.base_columns (), '{0,name}', '"  "')),
  'column_name_required',
  'every column needs a name'
);
reset role;

-- 12.
select is (
  pg_temp.save (p_columns => jsonb_set(pg_temp.base_columns (), '{2,name}', '" SEX "')),
  'column_names_not_unique',
  'two columns cannot share a name ignoring case and spaces'
);
reset role;

-- 13.
select is (
  pg_temp.save (p_columns => jsonb_set(pg_temp.base_columns (), '{2,name}', '"Source_Dataset"')),
  'column_names_not_unique',
  'no column is named like the source column while the crosswalk adds it'
);
reset role;

-- 14.
select is (
  pg_temp.save (p_layouts => jsonb_set(pg_temp.base_layouts (), '{0,is_reference}', 'false')),
  'reference_layout_required',
  'a crosswalk with layouts has a reference layout'
);
reset role;

-- 15.
select is (
  pg_temp.save (p_layouts => jsonb_set(jsonb_set(pg_temp.base_layouts (), '{2,is_reference}', 'true'), '{2,status}', '"mapped"')),
  'reference_layout_required',
  'a crosswalk has only one reference layout'
);
reset role;

-- 16.
select is (
  pg_temp.save (p_layouts => jsonb_set(pg_temp.base_layouts (), '{0,status}', '"review"')),
  'reference_layout_required',
  'the reference layout is mapped'
);
reset role;

-- 17.
select is (
  pg_temp.save (p_layouts => jsonb_set(pg_temp.base_layouts (), '{2,signature}', '"l1.0000000000000002"')),
  'layout_signatures_not_unique',
  'two layouts cannot share a signature'
);
reset role;

-- 18. The mapping that used the swapped layout follows it, so the only
-- thing wrong is that another crosswalk owns the layout.
select is (
  pg_temp.save (
    p_layouts => jsonb_set(pg_temp.base_layouts (), '{2,id}', '"c4710009-0000-4000-8000-000000000009"'),
    p_mappings => jsonb_set(pg_temp.base_mappings (), '{3,layout_id}', '"c4710009-0000-4000-8000-000000000009"')
  ),
  'item_not_in_crosswalk',
  'a layout of another crosswalk cannot be saved into this one'
);
reset role;

-- 19. The mapping that filled the swapped column follows it, so the only
-- thing wrong is that another crosswalk owns the column.
select is (
  pg_temp.save (
    p_columns => jsonb_set(pg_temp.base_columns (), '{2,id}', '"c4720009-0000-4000-8000-000000000009"'),
    p_mappings => jsonb_set(pg_temp.base_mappings (), '{4,column_id}', '"c4720009-0000-4000-8000-000000000009"')
  ),
  'item_not_in_crosswalk',
  'a column of another crosswalk cannot be saved into this one'
);
reset role;

-- 20.
select is (
  pg_temp.save (p_datasets => jsonb_set(pg_temp.base_datasets (), '{0,layout_id}', '"c471000f-0000-4000-8000-00000000000f"')),
  'item_not_in_crosswalk',
  'a dataset joins a layout saved with it'
);
reset role;

-- 21.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,column_id}', '"c472000f-0000-4000-8000-00000000000f"')),
  'item_not_in_crosswalk',
  'a mapping fills a column saved with it'
);
reset role;

-- 22.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{3,id}', '"c4730009-0000-4000-8000-000000000009"')),
  'item_not_in_crosswalk',
  'a mapping of another crosswalk cannot be saved into this one'
);
reset role;

-- 23.
select is (
  pg_temp.save (p_datasets => jsonb_set(pg_temp.base_datasets (), '{2,dataset_id}', '"c4450005-0000-4000-8000-000000000005"')),
  'dataset_not_readable',
  'a dataset in another workspace is refused'
);
reset role;

-- 24.
select is (
  pg_temp.save (p_datasets => jsonb_set(pg_temp.base_datasets (), '{2,dataset_id}', '"c445ffff-0000-4000-8000-00000000ffff"')),
  'dataset_not_readable',
  'a dataset that does not exist is refused like one the caller cannot view'
);
reset role;

-- 25.
select is (
  pg_temp.save (p_datasets => jsonb_set(pg_temp.base_datasets (), '{2,dataset_id}', '"c4450004-0000-4000-8000-000000000004"')),
  'dataset_not_readable',
  'a dataset the caller cannot view is refused'
);
reset role;

-- 26.
select is (
  pg_temp.save (p_columns => jsonb_set(pg_temp.base_columns (), '{1,entry_id}', '"c4600009-0000-4000-8000-000000000009"')),
  'entry_not_in_workspace',
  'a column cannot be governed by an entry from another workspace'
);
reset role;

-- 27.
select is (
  pg_temp.save (
    p_mappings => pg_temp.base_mappings () || '[{"id":"c473000a-0000-4000-8000-00000000000a","layout_id":"c4710001-0000-4000-8000-000000000001","column_id":"c4720001-0000-4000-8000-000000000001","fill":{"version":1,"kind":"empty"},"status":"confirmed","confidence":null,"reason":null}]'::jsonb
  ),
  'mappings_not_unique',
  'a layout fills a column once'
);
reset role;

-- 28.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,fill,version}', '2')),
  'fill_invalid',
  'a fill is version 1'
);
reset role;

-- 29.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,fill,kind}', '"lookup"')),
  'fill_invalid',
  'a fill has a known kind'
);
reset role;

-- 30.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,fill,source_column}', '"  "')),
  'fill_invalid',
  'a column fill names its source column'
);
reset role;

-- 31.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,fill}', '{"version":1,"kind":"constant","value":5}')),
  'fill_invalid',
  'a fixed value is text'
);
reset role;

-- 32.
select is (
  pg_temp.save (p_mappings => jsonb_set(pg_temp.base_mappings (), '{0,fill}', '{"version":1,"kind":"expression","sql":" "}')),
  'fill_invalid',
  'a Combine expression is not blank'
);
reset role;

-- A null set is refused, never read as empty. Refused saves are not
-- checked for leftovers: the error handler that returns the hint rolls
-- every write back, so such a check could not fail.

-- 33.
select is (
  pg_temp.save (p_columns => null::jsonb),
  'crosswalk_payload_invalid',
  'null columns are refused'
);
reset role;

-- 34.
select is (
  pg_temp.save (p_layouts => null::jsonb),
  'crosswalk_payload_invalid',
  'null layouts are refused'
);
reset role;

-- 35.
select is (
  pg_temp.save (p_datasets => null::jsonb),
  'crosswalk_payload_invalid',
  'null datasets are refused'
);
reset role;

-- 36.
select is (
  pg_temp.save (p_mappings => null::jsonb),
  'crosswalk_payload_invalid',
  'null mappings are refused'
);
reset role;

-- 37.
select is (
  pg_temp.save (p_datasets => jsonb_set(pg_temp.base_datasets (), '{2,dataset_id}', '"c4450006-0000-4000-8000-000000000006"')),
  'output_dataset_in_crosswalk',
  'the combined dataset cannot be one of the datasets it combines'
);
reset role;

-- Saves that succeed.

-- 38. A first save before any dataset is added.
select is (
  pg_temp.save (
    p_settings => pg_temp.base_settings () || '{"name":"Empty for now","description":null}'::jsonb,
    p_columns => '[]'::jsonb,
    p_layouts => '[]'::jsonb,
    p_datasets => '[]'::jsonb,
    p_mappings => '[]'::jsonb,
    p_crosswalk_id => 'c4700003-0000-4000-8000-000000000003'::uuid
  ),
  'no error',
  'a crosswalk with no layouts yet saves'
);
reset role;

-- 39. Read in its own statement: the outer query of a statement does not
-- see writes made by a function it calls.
select is (
  format(
    'name=%s description=%s layouts=%s',
    (select name from public.crosswalks where id = 'c4700003-0000-4000-8000-000000000003'::uuid),
    (select description from public.crosswalks where id = 'c4700003-0000-4000-8000-000000000003'::uuid),
    (select count(*) from public.crosswalks__layouts where crosswalk_id = 'c4700003-0000-4000-8000-000000000003'::uuid)
  ),
  'name=Empty for now description= layouts=0',
  'the empty save wrote its settings'
);

-- 40.
select is (
  pg_temp.save (p_settings => pg_temp.base_settings () || '{"codes_output_as":"codes"}'::jsonb),
  'no error',
  'a Data Sources editor saves columns, layouts, memberships, and mappings'
);
reset role;

-- 41.
select is (
  format(
    'name=%s description=%s codes=%s source=%s columns=%s layouts=%s memberships=%s mappings=%s reference=%s entry=%s',
    (select name from public.crosswalks where id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select description from public.crosswalks where id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select codes_output_as from public.crosswalks where id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select adds_source_column::text from public.crosswalks where id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__columns where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__layouts where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__datasets where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__mappings where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select id from public.crosswalks__layouts where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid and is_reference),
    (select entry_id from public.crosswalks__columns where id = 'c4720002-0000-4000-8000-000000000002'::uuid)
  ),
  'name=Kings and Queens description=Every borough line list on one layout. codes=codes source=true columns=3 layouts=3 memberships=3 mappings=5 reference=c4710001-0000-4000-8000-000000000001 entry=c4600001-0000-4000-8000-000000000001',
  'the save wrote the settings and every set'
);

-- 42.
select results_eq (
  $q$
    select fill, status::text, confidence, reason::text, layout_id, column_id
    from public.crosswalks__mappings
    where id = 'c4730002-0000-4000-8000-000000000002'::uuid
  $q$,
  $q$
    values (
      '{"version":1,"kind":"column","source_column":"CaseNo","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb,
      'suggested',
      0.92::numeric,
      'name_and_type',
      'c4710002-0000-4000-8000-000000000002'::uuid,
      'c4720001-0000-4000-8000-000000000001'::uuid
    )
  $q$,
  'a mapping keeps its fill, status, confidence, and reason as sent'
);

-- 43.
select ok (
  (select updated_at > '2020-01-02T00:00:00Z'::timestamptz from public.crosswalks where id = 'c4700001-0000-4000-8000-000000000001'::uuid),
  'a save moves the crosswalk''s updated_at'
);

-- A membership the editor cannot see, added as the table owner the way an
-- admin's save would add it, and the memberships as they are now.
insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
values ('c4100001-0000-4000-8000-000000000001'::uuid, 'c4700001-0000-4000-8000-000000000001'::uuid, 'c4450004-0000-4000-8000-000000000004'::uuid, 'c4710002-0000-4000-8000-000000000002'::uuid);

create temporary table cw_memberships_before as
select id, dataset_id
from public.crosswalks__datasets
where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid;

-- 44. A second save renames case_id, drops the third layout (its mapping
-- goes with it), moves Kings 2026-04 to the reference layout, and turns
-- one fill into a fixed value. It leaves out the Bronx membership, which
-- the editor cannot see.
select is (
  pg_temp.save (
    p_columns => jsonb_set(pg_temp.base_columns (), '{0,name}', '"case_number"'),
    p_layouts => jsonb_set(pg_temp.base_layouts () - 2, '{1,status}', '"review"'),
    p_datasets => jsonb_set(pg_temp.base_datasets (), '{1,layout_id}', '"c4710001-0000-4000-8000-000000000001"'),
    p_mappings => jsonb_set(
      jsonb_set(pg_temp.base_mappings () - 3, '{1,fill}', '{"version":1,"kind":"constant","value":"Kings"}'),
      '{1,status}',
      '"confirmed"'
    )
  ),
  'no error',
  'a second save renames a column, drops a layout, moves a dataset, and changes a fill'
);
reset role;

-- 45.
select is (
  format(
    'column=%s layouts=%s status=%s m4=%s m2=%s/%s',
    (select name from public.crosswalks__columns where id = 'c4720001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__layouts where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select status from public.crosswalks__layouts where id = 'c4710002-0000-4000-8000-000000000002'::uuid),
    (select count(*) from public.crosswalks__mappings where id = 'c4730004-0000-4000-8000-000000000004'::uuid),
    (select fill ->> 'value' from public.crosswalks__mappings where id = 'c4730002-0000-4000-8000-000000000002'::uuid),
    (select status from public.crosswalks__mappings where id = 'c4730002-0000-4000-8000-000000000002'::uuid)
  ),
  'column=case_number layouts=2 status=review m4=0 m2=Kings/confirmed',
  'the column and the mapping kept their ids, and the dropped layout took its mapping'
);

-- 46.
select results_eq (
  $q$
    select d.dataset_id, d.layout_id, b.id is not null
    from public.crosswalks__datasets d
    left join cw_memberships_before b on b.id = d.id
    where d.crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid
    order by d.dataset_id
  $q$,
  $q$
    values
      ('c4450001-0000-4000-8000-000000000001'::uuid, 'c4710002-0000-4000-8000-000000000002'::uuid, true),
      ('c4450002-0000-4000-8000-000000000002'::uuid, 'c4710001-0000-4000-8000-000000000001'::uuid, true),
      ('c4450003-0000-4000-8000-000000000003'::uuid, 'c4710001-0000-4000-8000-000000000001'::uuid, true),
      ('c4450004-0000-4000-8000-000000000004'::uuid, 'c4710002-0000-4000-8000-000000000002'::uuid, true)
  $q$,
  'memberships keep their ids, the moved one changed layout, and the hidden one survived'
);

-- 47. Dropping the layout that holds the hidden membership would delete
-- it, so the save is refused.
select is (
  pg_temp.save (
    p_layouts => pg_temp.base_layouts () - 2 - 1,
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450003-0000-4000-8000-000000000003","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => jsonb_build_array(pg_temp.base_mappings () -> 0)
  ),
  'dataset_not_readable',
  'a layout holding a dataset the caller cannot view cannot be dropped'
);
reset role;

-- 48.
select is (
  format(
    'layouts=%s bronx=%s',
    (select count(*) from public.crosswalks__layouts where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select layout_id from public.crosswalks__datasets where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid and dataset_id = 'c4450004-0000-4000-8000-000000000004'::uuid)
  ),
  'layouts=2 bronx=c4710002-0000-4000-8000-000000000002',
  'the refused save kept the layout and the hidden membership'
);

-- Later saves, from the state above: layouts one (the reference) and two,
-- columns case_number, sex, and onset, and the Bronx membership on layout two.
-- Layout three comes back holding Kings 2026-03, and the next save drops it
-- again, moving that dataset to the reference layout.

-- 49.
select is (
  pg_temp.save (
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710003-0000-4000-8000-000000000003"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450003-0000-4000-8000-000000000003","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb
  ),
  'no error',
  'a save adds a layout and moves a dataset onto it'
);
reset role;

create temporary table cw_membership_before_drop as
select id
from public.crosswalks__datasets
where
  crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid and
  dataset_id = 'c4450001-0000-4000-8000-000000000001'::uuid;

-- 50.
select is (
  pg_temp.save (
    p_layouts => pg_temp.base_layouts () - 2,
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450003-0000-4000-8000-000000000003","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => pg_temp.base_mappings () - 3
  ),
  'no error',
  'a save drops a layout and moves its dataset to a kept layout'
);
reset role;

-- 51.
select is (
  format(
    'same_membership=%s layout=%s dropped_layout=%s',
    (select count(*) from cw_membership_before_drop b join public.crosswalks__datasets d on d.id = b.id),
    (select layout_id from public.crosswalks__datasets where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid and dataset_id = 'c4450001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__layouts where id = 'c4710003-0000-4000-8000-000000000003'::uuid)
  ),
  'same_membership=1 layout=c4710001-0000-4000-8000-000000000001 dropped_layout=0',
  'the moved dataset kept its membership when its old layout was dropped in the same save'
);

-- 52. Queens is left out of the memberships, and the editor can view it, so
-- its membership is deleted. The Bronx one, which the editor cannot view,
-- stays.
select is (
  pg_temp.save (
    p_layouts => pg_temp.base_layouts () - 2,
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => pg_temp.base_mappings () - 3
  ),
  'no error',
  'a save leaves a viewable membership out'
);
reset role;

-- 53.
select is (
  (select string_agg(dataset_id::text, ',' order by dataset_id) from public.crosswalks__datasets where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
  'c4450001-0000-4000-8000-000000000001,c4450002-0000-4000-8000-000000000002,c4450004-0000-4000-8000-000000000004',
  'the viewable membership left out was deleted and the hidden one stayed'
);

-- 54. Onset is left out of the columns, and so is its mapping.
select is (
  pg_temp.save (
    p_columns => pg_temp.base_columns () - 2,
    p_layouts => pg_temp.base_layouts () - 2,
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => pg_temp.base_mappings () - 3 - 3
  ),
  'no error',
  'a save leaves a column out'
);
reset role;

-- 55.
select is (
  format(
    'columns=%s onset=%s onset_mapping=%s',
    (select count(*) from public.crosswalks__columns where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
    (select count(*) from public.crosswalks__columns where id = 'c4720003-0000-4000-8000-000000000003'::uuid),
    (select count(*) from public.crosswalks__mappings where id = 'c4730005-0000-4000-8000-000000000005'::uuid)
  ),
  'columns=2 onset=0 onset_mapping=0',
  'the column left out was deleted with its mapping'
);

-- 56. Two columns swap names in one save.
select is (
  pg_temp.save (
    p_columns => jsonb_set(jsonb_set(pg_temp.base_columns () - 2, '{0,name}', '"sex"'), '{1,name}', '"case_id"'),
    p_layouts => pg_temp.base_layouts () - 2,
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => pg_temp.base_mappings () - 3 - 3
  ),
  'no error',
  'a save swaps the names of two columns'
);
reset role;

-- 57.
select is (
  format(
    'first=%s second=%s',
    (select name from public.crosswalks__columns where id = 'c4720001-0000-4000-8000-000000000001'::uuid),
    (select name from public.crosswalks__columns where id = 'c4720002-0000-4000-8000-000000000002'::uuid)
  ),
  'first=sex second=case_id',
  'each column kept its id and took the other''s name'
);

-- 58. The reference moves from layout one to layout two.
select is (
  pg_temp.save (
    p_columns => pg_temp.base_columns () - 2,
    p_layouts => jsonb_set(
      jsonb_set(
        jsonb_set(jsonb_set(pg_temp.base_layouts () - 2, '{0,is_reference}', 'false'), '{0,status}', '"to_do"'),
        '{1,is_reference}',
        'true'
      ),
      '{1,status}',
      '"mapped"'
    ),
    p_datasets => '[{"dataset_id":"c4450001-0000-4000-8000-000000000001","layout_id":"c4710001-0000-4000-8000-000000000001"},{"dataset_id":"c4450002-0000-4000-8000-000000000002","layout_id":"c4710001-0000-4000-8000-000000000001"}]'::jsonb,
    p_mappings => pg_temp.base_mappings () - 3 - 3
  ),
  'no error',
  'a save moves the reference to another layout'
);
reset role;

-- 59.
select is (
  (select string_agg(id::text || ':' || is_reference::text || ':' || status::text, ',' order by id) from public.crosswalks__layouts where crosswalk_id = 'c4700001-0000-4000-8000-000000000001'::uuid),
  'c4710001-0000-4000-8000-000000000001:false:to_do,c4710002-0000-4000-8000-000000000002:true:mapped',
  'layout two is the only reference, and layout one is no longer mapped'
);

select * from finish ();

rollback;
