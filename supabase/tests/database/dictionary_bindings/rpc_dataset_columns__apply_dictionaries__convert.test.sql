\set ON_ERROR_STOP on

/**
 * `rpc_dataset_columns__apply_dictionaries` with conversions. An uploaded
 * dataset converts in place with pinned pairs; a linked dataset converts
 * live; nothing else converts. The conversion fields fit their mode,
 * values added to a code list need Data Sources editor and pass the
 * list's own checks, a converted column's `data_type` follows what it
 * outputs and comes back when it stops converting, and a kept original
 * column lives exactly as long as its binding keeps it. Refusals change
 * nothing.
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

-- Runs one apply as the given user and returns its hint, or 'no error'.
create function pg_temp.apply_as (p_user_id uuid, p_dataset_id uuid, p_bindings jsonb, p_added_pairs jsonb default '[]'::jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_dataset_columns__apply_dictionaries (%L::uuid, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dataset_id,
    p_bindings,
    p_added_pairs
  ));
end;
$$;

-- One binding of the NYS codes dictionary: a pinned decode by default,
-- with `p_extra` merged over it.
create function pg_temp.binding (p_column_id uuid, p_entry_id uuid, p_code_list_id uuid, p_extra jsonb default '{}'::jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'dataset_column_id', p_column_id,
    'dictionary_id', 'd3400001-0000-4000-8000-000000000001',
    'entry_id', p_entry_id,
    'code_list_id', p_code_list_id,
    'mode', 'convert',
    'direction', 'decode',
    'keeps_original', false,
    'value_overrides', '[]'::jsonb,
    'is_pinned', true
  ) || p_extra;
$$;

insert into auth.users (id, email, aud, role)
values
  ('d3000001-0000-4000-8000-000000000001'::uuid, 'conv_apply_owner@test.dev', 'authenticated', 'authenticated'),
  ('d3000002-0000-4000-8000-000000000002'::uuid, 'conv_apply_viewer@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('d3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'conv apply ws', 'conv-apply-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d3200001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid),
  ('d3200002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d3300001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d3300002-0000-4000-8000-000000000002'::uuid, 'd3000002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer')
on conflict (id) do nothing;

-- The viewer reads dictionaries as a Global Viewer and edits Kings through
-- a share, so they may attach but not add values to a code list.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'd3100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'd3000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

-- An upload, a live connection, and a linked dataset with its source.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('d3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('d3450002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3300001-0000-4000-8000-000000000001'::uuid, 'Queens sheet', 'google_sheets'::public.datasets__source_type),
  ('d3450003-0000-4000-8000-000000000003'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3300001-0000-4000-8000-000000000001'::uuid, 'Bronx (labeled)', 'virtual'::public.datasets__source_type),
  ('d3450004-0000-4000-8000-000000000004'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
values ('d3450003-0000-4000-8000-000000000003'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d3450004-0000-4000-8000-000000000004"', 'd3450004-0000-4000-8000-000000000004'::uuid);

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values ('d3100001-0000-4000-8000-000000000001'::uuid, 'dataset'::public.resource_type, 'd3450001-0000-4000-8000-000000000001'::uuid, 'user'::public.share_principal_type, 'd3000002-0000-4000-8000-000000000002'::uuid, 'editor'::public.role_level);

-- Kings already has a column named ses_original, so SES's copy must take
-- the next free name.
insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('d3460002-0000-4000-8000-000000000002'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'SES', 'SES', 'BIGINT', 'BIGINT', 'bigint', 1),
  ('d3460003-0000-4000-8000-000000000003'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'sex_label', 'sex_label', 'VARCHAR', 'VARCHAR', 'varchar', 2),
  ('d3460004-0000-4000-8000-000000000004'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'CaseNo', 'CaseNo', 'VARCHAR', 'VARCHAR', 'varchar', 3),
  ('d3460005-0000-4000-8000-000000000005'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'ses_original', 'ses_original', 'VARCHAR', 'VARCHAR', 'varchar', 4),
  ('d3460006-0000-4000-8000-000000000006'::uuid, 'd3450002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('d3460007-0000-4000-8000-000000000007'::uuid, 'd3450003-0000-4000-8000-000000000003'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('d3460008-0000-4000-8000-000000000008'::uuid, 'd3450004-0000-4000-8000-000000000004'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('d3400001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3000001-0000-4000-8000-000000000001'::uuid, 'd3300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, is_ordered, pairs)
values
  ('d3500001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', false, '[{"code":"1","label":"Male","accepted_spellings":["man"],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]'::jsonb),
  ('d3500002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'SES', true, '[{"code":"1","label":"Low","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Lower-middle","accepted_spellings":[],"is_missing":false},{"code":"3","label":"Upper-middle","accepted_spellings":[],"is_missing":false},{"code":"4","label":"High","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d3500009-0000-4000-8000-000000000009'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'Unused', false, '[{"code":"A","label":"Alpha","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('d3600001-0000-4000-8000-000000000001'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('d3600002-0000-4000-8000-000000000002'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'ses', 'ordered', 1),
  ('d3600003-0000-4000-8000-000000000003'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'case_id', 'identifier', 2),
  ('d3600009-0000-4000-8000-000000000009'::uuid, 'd3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'unused', 'categorical', 3);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('d3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, true),
  ('d3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'd3600002-0000-4000-8000-000000000002'::uuid, 'd3500002-0000-4000-8000-000000000002'::uuid, true),
  ('d3100001-0000-4000-8000-000000000001'::uuid, 'd3400001-0000-4000-8000-000000000001'::uuid, 'd3600009-0000-4000-8000-000000000009'::uuid, 'd3500009-0000-4000-8000-000000000009'::uuid, true);

select plan (40);

-- 1.
select has_function ('public', 'rpc_dataset_columns__apply_dictionaries', array['uuid', 'jsonb', 'jsonb']::name[], 'the apply takes the bindings and the values to add');

-- 2.
select hasnt_function ('public', 'rpc_dataset_columns__apply_dictionaries', array['uuid', 'jsonb']::name[], 'the two-argument apply is gone, and its calls resolve to the default');

-- Refusals. None of them changes anything.

-- 3.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460004-0000-4000-8000-000000000004'::uuid, 'd3600003-0000-4000-8000-000000000003'::uuid, null))),
  'convert_needs_code_list',
  'converting a column whose entry has no code list is refused'
);
reset role;

-- 4.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"mode":"reference","is_pinned":false,"keeps_original":true}'))),
  'binding_payload_invalid',
  'a reference binding cannot keep original values'
);
reset role;

-- 5.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"mode":"reference"}'))),
  'binding_payload_invalid',
  'a reference binding cannot be pinned'
);
reset role;

-- 6.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"mode":"reference","is_pinned":false,"value_overrides":[{"value":"7","action":"keep"}]}'))),
  'binding_payload_invalid',
  'a reference binding cannot override values'
);
reset role;

-- 7.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"keeps_original":"yes"}'))),
  'binding_payload_invalid',
  'keeps_original must be a boolean'
);
reset role;

-- 8.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"value_overrides":[{"value":"7","action":"drop"}]}'))),
  'binding_payload_invalid',
  'an unknown override action is refused'
);
reset role;

-- 9.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"value_overrides":[{"value":"7","action":"map"}]}'))),
  'binding_payload_invalid',
  'a map override needs a code'
);
reset role;

-- 10.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"value_overrides":[{"value":"7","action":"empty","code":"1"}]}'))),
  'binding_payload_invalid',
  'only a map override has a code'
);
reset role;

-- 11.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"value_overrides":[{"value":"7","action":"map","code":"5"}]}'))),
  'binding_payload_invalid',
  'a map override must name a code in the list'
);
reset role;

-- 12.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"value_overrides":[{"value":" 7","action":"keep"},{"value":"7 ","action":"empty"}]}'))),
  'binding_payload_invalid',
  'one value is overridden once, ignoring spaces'
);
reset role;

-- 13.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"is_pinned":false}'))),
  'binding_mode_unsupported',
  'an upload converts in place only with pinned pairs'
);
reset role;

-- 14.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450002-0000-4000-8000-000000000002'::uuid, jsonb_build_array(pg_temp.binding ('d3460006-0000-4000-8000-000000000006'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid))),
  'binding_mode_unsupported',
  'a live connection cannot be converted in place'
);
reset role;

-- 15.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450003-0000-4000-8000-000000000003'::uuid, jsonb_build_array(pg_temp.binding ('d3460007-0000-4000-8000-000000000007'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid))),
  'binding_mode_unsupported',
  'a linked dataset follows the dictionary, so it is never pinned'
);
reset role;

-- 16.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450004-0000-4000-8000-000000000004'::uuid, jsonb_build_array(pg_temp.binding ('d3460008-0000-4000-8000-000000000008'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid))),
  'dataset_has_linked_datasets',
  'a dataset a linked dataset reads cannot be converted in place'
);
reset role;

-- 17.
select is (
  pg_temp.apply_as (
    'd3000002-0000-4000-8000-000000000002'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"mode":"reference","is_pinned":false}')),
    '[{"code_list_id":"d3500001-0000-4000-8000-000000000001","code":"8","label":"Other"}]'::jsonb
  ),
  'dictionary_editor_required',
  'adding a value to a code list needs Data Sources editor'
);
reset role;

-- 18.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid)),
    '[{"code_list_id":"d3500009-0000-4000-8000-000000000009","code":"B","label":"Beta"}]'::jsonb
  ),
  'code_list_not_in_entry',
  'a value can only be added to a list this apply uses'
);
reset role;

-- 19.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid)),
    '[{"code_list_id":"d3500001-0000-4000-8000-000000000001","code":" ","label":"Other"}]'::jsonb
  ),
  'code_pair_incomplete',
  'an added value needs a code'
);
reset role;

-- 20.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid)),
    '[{"code_list_id":"d3500001-0000-4000-8000-000000000001","code":" 1","label":"Other"}]'::jsonb
  ),
  'codes_not_unique',
  'an added code cannot repeat one in the list'
);
reset role;

-- 21.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid)),
    '[{"code_list_id":"d3500001-0000-4000-8000-000000000001","code":"8","label":"MAN"}]'::jsonb
  ),
  'labels_not_unique',
  'an added label cannot repeat a label or accepted spelling in the list'
);
reset role;

-- 22.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid)),
    '{}'::jsonb
  ),
  'binding_payload_invalid',
  'added values must be an array'
);
reset role;

-- 23.
select results_eq (
  $q$
    select
      (select count(*)::int from public.dataset_columns__dictionary_bindings where workspace_id = 'd3100001-0000-4000-8000-000000000001'::uuid),
      (select version from public.data_dictionaries where id = 'd3400001-0000-4000-8000-000000000001'::uuid),
      (select jsonb_array_length(pairs) from public.data_dictionaries__code_lists where id = 'd3500001-0000-4000-8000-000000000001'::uuid)
  $q$,
  $q$ values (0, 1, 3) $q$,
  'no refusal wrote a binding, a value, or a version'
);

-- Converting in place.

-- 24.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"keeps_original":true,"value_overrides":[{"value":"7","action":"empty"}]}'),
      pg_temp.binding ('d3460002-0000-4000-8000-000000000002'::uuid, 'd3600002-0000-4000-8000-000000000002'::uuid, 'd3500002-0000-4000-8000-000000000002'::uuid, '{"keeps_original":true}'),
      pg_temp.binding ('d3460003-0000-4000-8000-000000000003'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"direction":"encode"}'),
      pg_temp.binding ('d3460004-0000-4000-8000-000000000004'::uuid, 'd3600003-0000-4000-8000-000000000003'::uuid, null, '{"mode":"reference","is_pinned":false}')
    ),
    '[{"code_list_id":"d3500001-0000-4000-8000-000000000001","code":"8","label":"Other"}]'::jsonb
  ),
  'no error',
  'an editor converts three columns in place, adds a value, and describes a fourth'
);
reset role;

-- 25.
select is (
  (select version from public.data_dictionaries where id = 'd3400001-0000-4000-8000-000000000001'::uuid),
  2,
  'adding a value bumps the dictionary''s version once'
);

-- 26.
select is (
  (select pairs -> 3 from public.data_dictionaries__code_lists where id = 'd3500001-0000-4000-8000-000000000001'::uuid),
  '{"code":"8","label":"Other","accepted_spellings":[],"is_missing":false}'::jsonb,
  'the added value goes at the end of its list'
);

-- 27. The pinned pairs are the list as it is after the added value.
select results_eq (
  $q$
    select
      dataset_column_id, mode::text, direction::text, keeps_original,
      jsonb_array_length(pinned_pairs), pinned_is_ordered,
      applied_dictionary_version, replaced_data_type::text
    from public.dataset_columns__dictionary_bindings
    where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid
    order by dataset_column_id
  $q$,
  $q$
    values
      ('d3460001-0000-4000-8000-000000000001'::uuid, 'convert', 'decode', true, 4, false, 2, 'bigint'),
      ('d3460002-0000-4000-8000-000000000002'::uuid, 'convert', 'decode', true, 4, true, 2, 'bigint'),
      ('d3460003-0000-4000-8000-000000000003'::uuid, 'convert', 'encode', false, 4, false, 2, 'varchar'),
      ('d3460004-0000-4000-8000-000000000004'::uuid, 'reference', 'decode', false, null::integer, null::boolean, 2, null::text)
  $q$,
  'each binding is stored pinned to the current pairs, with the type it replaced'
);

-- 28.
select is (
  (select value_overrides from public.dataset_columns__dictionary_bindings where dataset_column_id = 'd3460001-0000-4000-8000-000000000001'::uuid),
  '[{"value":"7","action":"empty"}]'::jsonb,
  'the overrides are stored as given'
);

-- 29.
select results_eq (
  $q$
    select name, data_type::text
    from public.dataset_columns
    where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid and dictionary_binding_id is null
    order by column_idx
  $q$,
  $q$
    values
      ('GENDER', 'varchar'),
      ('SES', 'varchar'),
      ('sex_label', 'bigint'),
      ('CaseNo', 'varchar'),
      ('ses_original', 'varchar')
  $q$,
  'decoded columns hold text and the encoded column whole-number codes'
);

-- 30.
select results_eq (
  $q$
    select dc.name, dc.original_name, dc.data_type::text, dc.detected_data_type::text, dc.column_idx, b.dataset_column_id
    from public.dataset_columns dc
    join public.dataset_columns__dictionary_bindings b on b.id = dc.dictionary_binding_id
    where dc.dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid
    order by dc.column_idx
  $q$,
  $q$
    values
      ('GENDER_original', 'GENDER', 'bigint', 'BIGINT', 5, 'd3460001-0000-4000-8000-000000000001'::uuid),
      ('SES_original_2', 'SES', 'bigint', 'BIGINT', 6, 'd3460002-0000-4000-8000-000000000002'::uuid)
  $q$,
  'each kept original column reads its column''s stored values, after the last column, under a free name'
);

-- 31.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.binding (
      (select id from public.dataset_columns where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid and name = 'GENDER_original'),
      'd3600001-0000-4000-8000-000000000001'::uuid,
      'd3500001-0000-4000-8000-000000000001'::uuid,
      '{"mode":"reference","is_pinned":false}'
    ))
  ),
  'column_not_in_dataset',
  'a kept original column cannot be bound'
);
reset role;

-- Remembers GENDER's copy, to check that a re-apply keeps the same row.
create temp table gender_copy as
select id
from public.dataset_columns
where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid and name = 'GENDER_original';

-- 32.
select is (
  pg_temp.apply_as (
    'd3000001-0000-4000-8000-000000000001'::uuid,
    'd3450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.binding ('d3460001-0000-4000-8000-000000000001'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"keeps_original":true,"value_overrides":[{"value":"7","action":"empty"}]}'),
      pg_temp.binding ('d3460002-0000-4000-8000-000000000002'::uuid, 'd3600002-0000-4000-8000-000000000002'::uuid, 'd3500002-0000-4000-8000-000000000002'::uuid, '{"mode":"reference","is_pinned":false}'),
      pg_temp.binding ('d3460004-0000-4000-8000-000000000004'::uuid, 'd3600003-0000-4000-8000-000000000003'::uuid, null, '{"mode":"reference","is_pinned":false}')
    )
  ),
  'no error',
  'an editor keeps GENDER converted, attaches SES as reference, and drops sex_label'
);
reset role;

-- 33.
select results_eq (
  $q$
    select name, data_type::text
    from public.dataset_columns
    where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid and dictionary_binding_id is null
    order by column_idx
  $q$,
  $q$
    values
      ('GENDER', 'varchar'),
      ('SES', 'bigint'),
      ('sex_label', 'varchar'),
      ('CaseNo', 'varchar'),
      ('ses_original', 'varchar')
  $q$,
  'a column that stops converting gets its type back, and one still converting keeps its'
);

-- 34.
select results_eq (
  $q$
    select id
    from public.dataset_columns
    where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid and dictionary_binding_id is not null
  $q$,
  'select id from pg_temp.gender_copy',
  'SES''s copy is removed and GENDER''s copy is the same row'
);

-- 35.
select results_eq (
  $q$
    select mode::text, keeps_original, pinned_pairs is null, replaced_data_type is null
    from public.dataset_columns__dictionary_bindings
    where dataset_column_id = 'd3460002-0000-4000-8000-000000000002'::uuid
  $q$,
  $q$ values ('reference', false, true, true) $q$,
  'a binding changed to reference carries no conversion'
);

-- Converting live, on a linked dataset.

-- 36.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450003-0000-4000-8000-000000000003'::uuid, jsonb_build_array(pg_temp.binding ('d3460007-0000-4000-8000-000000000007'::uuid, 'd3600001-0000-4000-8000-000000000001'::uuid, 'd3500001-0000-4000-8000-000000000001'::uuid, '{"is_pinned":false}'))),
  'no error',
  'an editor converts a linked dataset''s column live'
);
reset role;

-- 37.
select results_eq (
  $q$
    select b.pinned_pairs is null, b.replaced_data_type::text, dc.data_type::text
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'd3450003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$ values (true, 'bigint', 'varchar') $q$,
  'a live binding follows the list and still sets the type'
);

-- 38.
select is (
  pg_temp.apply_as ('d3000001-0000-4000-8000-000000000001'::uuid, 'd3450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'no error',
  'an editor removes every dictionary from Kings'
);
reset role;

-- 39.
select results_eq (
  $q$
    select name, data_type::text
    from public.dataset_columns
    where dataset_id = 'd3450001-0000-4000-8000-000000000001'::uuid
    order by column_idx
  $q$,
  $q$
    values
      ('GENDER', 'bigint'),
      ('SES', 'bigint'),
      ('sex_label', 'varchar'),
      ('CaseNo', 'varchar'),
      ('ses_original', 'varchar')
  $q$,
  'removing the bindings restores every type and removes the kept original column'
);

-- 40.
select is (
  (select version from public.data_dictionaries where id = 'd3400001-0000-4000-8000-000000000001'::uuid),
  2,
  'an apply that adds no value leaves the version alone'
);

select * from finish ();

rollback;
