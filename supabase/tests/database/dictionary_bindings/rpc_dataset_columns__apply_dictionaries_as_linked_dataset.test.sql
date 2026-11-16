\set ON_ERROR_STOP on

/**
 * `rpc_dataset_columns__apply_dictionaries_as_linked_dataset` creates a
 * virtual dataset over a source with live convert bindings, in one
 * transaction. Only an editor of the source who reads dictionaries and may
 * add datasets can call it; the source keeps the same entries as
 * reference, with its values and types as stored; the linked dataset gets
 * the converted columns live and the reference ones as reference; a
 * refusal anywhere,
 * even after the new dataset's row was written, leaves nothing behind.
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

-- Like `error_hint`, but returns the error's SQLSTATE, for a refusal that
-- carries no hint.
create function pg_temp.error_state (p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'no error';
exception
  when others then
    return sqlstate;
end;
$$;

-- The SQL that creates one linked dataset as the given user.
create function pg_temp.linked_sql (p_user_id uuid, p_source_id uuid, p_linked_id uuid, p_name text, p_bindings jsonb, p_added_pairs jsonb) returns text language sql as $$
  select format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset (%L::uuid, %L::uuid, %L, %L::jsonb, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_source_id, p_linked_id, p_name, p_bindings, p_added_pairs
  );
$$;

-- Creates one linked dataset as the given user and returns its hint, or
-- 'no error'.
create function pg_temp.linked_as (p_user_id uuid, p_source_id uuid, p_linked_id uuid, p_name text, p_bindings jsonb, p_added_pairs jsonb default '[]'::jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (pg_temp.linked_sql (p_user_id, p_source_id, p_linked_id, p_name, p_bindings, p_added_pairs));
end;
$$;

-- Creates one linked dataset as the given user and returns what the RPC
-- returns.
create function pg_temp.create_linked_as (p_user_id uuid, p_source_id uuid, p_linked_id uuid, p_name text, p_bindings jsonb) returns uuid language plpgsql as $$
declare
  v_linked_id uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_linked_id := public.rpc_dataset_columns__apply_dictionaries_as_linked_dataset (p_source_id, p_linked_id, p_name, p_bindings);
  reset role;
  return v_linked_id;
end;
$$;

-- Runs one in-place apply as the given user and returns its hint.
create function pg_temp.apply_as (p_user_id uuid, p_dataset_id uuid, p_bindings jsonb) returns text language plpgsql as $$
begin
  return pg_temp.error_hint (format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
      select public.rpc_dataset_columns__apply_dictionaries (%L::uuid, %L::jsonb);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    p_dataset_id,
    p_bindings
  ));
end;
$$;

-- One binding of the NYS codes dictionary: a live decode by default, with
-- `p_extra` merged over it.
create function pg_temp.binding (p_column_id uuid, p_entry_id uuid, p_code_list_id uuid, p_extra jsonb default '{}'::jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'dataset_column_id', p_column_id,
    'dictionary_id', 'd4400001-0000-4000-8000-000000000001',
    'entry_id', p_entry_id,
    'code_list_id', p_code_list_id,
    'mode', 'convert',
    'direction', 'decode',
    'keeps_original', false,
    'value_overrides', '[]'::jsonb,
    'is_pinned', false
  ) || p_extra;
$$;

-- The set the linked dataset is created with: GENDER converted with its
-- original kept, SES converted, CaseNo described.
create function pg_temp.kings_bindings () returns jsonb language sql as $$
  select jsonb_build_array(
    pg_temp.binding ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid, '{"keeps_original":true}'),
    pg_temp.binding ('d4460002-0000-4000-8000-000000000002'::uuid, 'd4600002-0000-4000-8000-000000000002'::uuid, 'd4500002-0000-4000-8000-000000000002'::uuid),
    pg_temp.binding ('d4460003-0000-4000-8000-000000000003'::uuid, 'd4600003-0000-4000-8000-000000000003'::uuid, null, '{"mode":"reference"}')
  );
$$;

insert into auth.users (id, email, aud, role)
values
  ('d4000001-0000-4000-8000-000000000001'::uuid, 'conv_linked_owner@test.dev', 'authenticated', 'authenticated'),
  ('d4000002-0000-4000-8000-000000000002'::uuid, 'conv_linked_editor@test.dev', 'authenticated', 'authenticated'),
  ('d4000003-0000-4000-8000-000000000003'::uuid, 'conv_linked_viewer@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('d4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'conv linked ws', 'conv-linked-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d4200001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid),
  ('d4200002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000002-0000-4000-8000-000000000002'::uuid),
  ('d4200003-0000-4000-8000-000000000003'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d4300001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d4300002-0000-4000-8000-000000000002'::uuid, 'd4000002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4200002-0000-4000-8000-000000000002'::uuid, 'Editor', 'Editor'),
  ('d4300003-0000-4000-8000-000000000003'::uuid, 'd4000003-0000-4000-8000-000000000003'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4200003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer')
on conflict (id) do nothing;

-- The editor edits every dataset and dictionary but does not manage the
-- workspace, so they cannot add a dataset. The owner can.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'd4100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'd4000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'd4000003-0000-4000-8000-000000000003'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- Kings is the source. Bronx (labeled) is already a linked dataset over
-- Bronx.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('d4450001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'd4300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('d4450002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'd4300001-0000-4000-8000-000000000001'::uuid, 'Bronx (labeled)', 'virtual'::public.datasets__source_type),
  ('d4450003-0000-4000-8000-000000000003'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'd4300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
values ('d4450002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d4450003-0000-4000-8000-000000000003"', 'd4450003-0000-4000-8000-000000000003'::uuid);

-- CaseNo was renamed from case_no_raw: the linked dataset reads Kings's
-- view, so it sees CaseNo.
insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, description, column_idx)
values
  ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 'Sex at intake', 0),
  ('d4460002-0000-4000-8000-000000000002'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'SES', 'SES', 'BIGINT', 'BIGINT', 'bigint', null, 1),
  ('d4460003-0000-4000-8000-000000000003'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'case_no_raw', 'CaseNo', 'VARCHAR', 'VARCHAR', 'varchar', null, 2),
  ('d4460004-0000-4000-8000-000000000004'::uuid, 'd4450002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', null, 0),
  ('d4460005-0000-4000-8000-000000000005'::uuid, 'd4450003-0000-4000-8000-000000000003'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', null, 0);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('d4400001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4000001-0000-4000-8000-000000000001'::uuid, 'd4300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, is_ordered, pairs)
values
  ('d4500001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', false, '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false},{"code":"2","label":"Female","accepted_spellings":[],"is_missing":false},{"code":"9","label":"Unknown","accepted_spellings":[],"is_missing":true}]'::jsonb),
  ('d4500002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'SES', true, '[{"code":"1","label":"Low","accepted_spellings":[],"is_missing":false},{"code":"2","label":"High","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('d4600001-0000-4000-8000-000000000001'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('d4600002-0000-4000-8000-000000000002'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'ses', 'ordered', 1),
  ('d4600003-0000-4000-8000-000000000003'::uuid, 'd4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'case_id', 'identifier', 2);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('d4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid, true),
  ('d4100001-0000-4000-8000-000000000001'::uuid, 'd4400001-0000-4000-8000-000000000001'::uuid, 'd4600002-0000-4000-8000-000000000002'::uuid, 'd4500002-0000-4000-8000-000000000002'::uuid, true);

select plan (26);

-- 1.
select has_function (
  'public',
  'rpc_dataset_columns__apply_dictionaries_as_linked_dataset',
  array['uuid', 'uuid', 'text', 'jsonb', 'jsonb']::name[],
  'the linked-dataset apply takes the source, the new id and name, the bindings, and the values to add'
);

-- Refusals.

-- 2.
select is (
  pg_temp.linked_as ('d4000003-0000-4000-8000-000000000003'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', pg_temp.kings_bindings ()),
  'dataset_editor_required',
  'a viewer of the source cannot create a linked dataset'
);
reset role;

-- 3.
select is (
  pg_temp.linked_as ('d4000002-0000-4000-8000-000000000002'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', pg_temp.kings_bindings ()),
  'dataset_creator_required',
  'an editor who cannot add datasets cannot create a linked dataset'
);
reset role;

-- 4.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd445ffff-0000-4000-8000-00000000ffff'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', pg_temp.kings_bindings ()),
  'dataset_editor_required',
  'a source that does not exist is refused like a forbidden one'
);
reset role;

-- 5.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450002-0000-4000-8000-000000000002'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Bronx (labeled again)', jsonb_build_array(pg_temp.binding ('d4460004-0000-4000-8000-000000000004'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid))),
  'binding_mode_unsupported',
  'a linked dataset cannot be the source of another'
);
reset role;

-- 6.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', jsonb_build_array(pg_temp.binding ('d4460003-0000-4000-8000-000000000003'::uuid, 'd4600003-0000-4000-8000-000000000003'::uuid, null, '{"mode":"reference"}'))),
  'binding_payload_invalid',
  'a linked dataset must convert at least one column'
);
reset role;

-- 7.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', jsonb_build_array(pg_temp.binding ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid, '{"is_pinned":true}'))),
  'binding_payload_invalid',
  'a linked dataset follows the dictionary, so nothing in it is pinned'
);
reset role;

-- 8.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, '   ', pg_temp.kings_bindings ()),
  'binding_payload_invalid',
  'a linked dataset needs a name'
);
reset role;

-- 9.
select is (
  pg_temp.linked_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, 'd4450009-0000-4000-8000-000000000009'::uuid, 'Kings (labeled)', jsonb_build_array(pg_temp.binding ('d4460003-0000-4000-8000-000000000003'::uuid, 'd4600003-0000-4000-8000-000000000003'::uuid, null))),
  'convert_needs_code_list',
  'converting a column whose entry has no code list is refused'
);
reset role;

-- 10.
select is (
  (select count(*)::int from public.datasets where id = 'd4450009-0000-4000-8000-000000000009'::uuid),
  0,
  'no refusal created a dataset'
);

-- Kings is converted in place first, so the linked apply has something to
-- undo.

-- 11.
select is (
  pg_temp.apply_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid, '{"is_pinned":true,"keeps_original":true}'))),
  'no error',
  'the owner converts GENDER in place'
);
reset role;

-- 12. The new id is already taken, so creating the dataset fails after the
-- added value and the source's bindings were written. All of it rolls back.
select is (
  pg_temp.error_state (pg_temp.linked_sql (
    'd4000001-0000-4000-8000-000000000001'::uuid,
    'd4450001-0000-4000-8000-000000000001'::uuid,
    'd4450003-0000-4000-8000-000000000003'::uuid,
    'Kings (labeled)',
    pg_temp.kings_bindings (),
    '[{"code_list_id":"d4500001-0000-4000-8000-000000000001","code":"8","label":"Other"}]'::jsonb
  )),
  '23505',
  'a failure while creating the dataset aborts the whole apply'
);
reset role;

-- 13.
select results_eq (
  $q$
    select
      (select mode::text from public.dataset_columns__dictionary_bindings where dataset_column_id = 'd4460001-0000-4000-8000-000000000001'::uuid),
      (select version from public.data_dictionaries where id = 'd4400001-0000-4000-8000-000000000001'::uuid),
      (select jsonb_array_length(pairs) from public.data_dictionaries__code_lists where id = 'd4500001-0000-4000-8000-000000000001'::uuid)
  $q$,
  $q$ values ('convert', 1, 3) $q$,
  'the failed apply left the source''s bindings, the list, and the version as they were'
);

-- Creating it.

-- 14.
select is (
  pg_temp.linked_as (
    'd4000001-0000-4000-8000-000000000001'::uuid,
    'd4450001-0000-4000-8000-000000000001'::uuid,
    'd4450009-0000-4000-8000-000000000009'::uuid,
    'Kings (labeled)',
    pg_temp.kings_bindings (),
    '[{"code_list_id":"d4500001-0000-4000-8000-000000000001","code":"8","label":"Other"}]'::jsonb
  ),
  'no error',
  'the owner creates a linked dataset over Kings'
);
reset role;

-- 15.
select results_eq (
  $q$
    select name, source_type::text, owner_id
    from public.datasets
    where id = 'd4450009-0000-4000-8000-000000000009'::uuid
  $q$,
  $q$ values ('Kings (labeled)', 'virtual', 'd4000001-0000-4000-8000-000000000001'::uuid) $q$,
  'the linked dataset is a virtual dataset the caller owns'
);

-- 16.
select results_eq (
  $q$
    select raw_sql, linked_source_dataset_id
    from public.datasets__virtual
    where dataset_id = 'd4450009-0000-4000-8000-000000000009'::uuid
  $q$,
  $q$ values ('SELECT * FROM "d4450001-0000-4000-8000-000000000001"', 'd4450001-0000-4000-8000-000000000001'::uuid) $q$,
  'it reads every column of its source, and names it'
);

-- 17.
select results_eq (
  $q$
    select original_name, name, detected_data_type::text, data_type::text, description, dictionary_binding_id is not null
    from public.dataset_columns
    where dataset_id = 'd4450009-0000-4000-8000-000000000009'::uuid
    order by column_idx, name
  $q$,
  $q$
    values
      ('GENDER', 'GENDER', 'BIGINT', 'varchar', 'Sex at intake', false),
      ('SES', 'SES', 'BIGINT', 'varchar', null::text, false),
      ('CaseNo', 'CaseNo', 'VARCHAR', 'varchar', null::text, false),
      ('GENDER', 'GENDER_original', 'BIGINT', 'bigint', null::text, true)
  $q$,
  'its columns are the source''s as the source''s view names them, with the converted types and a kept original'
);

-- 18.
select results_eq (
  $q$
    select dc.name, b.mode::text, b.direction::text, b.keeps_original, b.pinned_pairs is null, b.replaced_data_type::text, b.applied_dictionary_version
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'd4450009-0000-4000-8000-000000000009'::uuid
    order by dc.name
  $q$,
  $q$
    values
      ('CaseNo', 'reference', 'decode', false, true, null::text, 2),
      ('GENDER', 'convert', 'decode', true, true, 'bigint', 2),
      ('SES', 'convert', 'decode', false, true, 'bigint', 2)
  $q$,
  'its converted columns follow the dictionary live, and its described column is bound as reference, at the version the added value made'
);

-- 19.
select results_eq (
  $q$
    select b.dictionary_id, b.entry_id, b.code_list_id
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'd4450009-0000-4000-8000-000000000009'::uuid and dc.name = 'CaseNo'
  $q$,
  $q$ values ('d4400001-0000-4000-8000-000000000001'::uuid, 'd4600003-0000-4000-8000-000000000003'::uuid, null::uuid) $q$,
  'a reference-bound source column gives the linked column a reference binding to the same entry and code list'
);

-- 20.
select results_eq (
  $q$
    select dc.name, b.mode::text, b.keeps_original, b.pinned_pairs is null, b.replaced_data_type is null
    from public.dataset_columns__dictionary_bindings b
    join public.dataset_columns dc on dc.id = b.dataset_column_id
    where b.dataset_id = 'd4450001-0000-4000-8000-000000000001'::uuid
    order by dc.name
  $q$,
  $q$
    values
      ('CaseNo', 'reference', false, true, true),
      ('GENDER', 'reference', false, true, true),
      ('SES', 'reference', false, true, true)
  $q$,
  'the source keeps the same entries as reference'
);

-- 21.
select results_eq (
  $q$
    select name, data_type::text
    from public.dataset_columns
    where dataset_id = 'd4450001-0000-4000-8000-000000000001'::uuid
    order by column_idx
  $q$,
  $q$ values ('GENDER', 'bigint'), ('SES', 'bigint'), ('CaseNo', 'varchar') $q$,
  'the source''s in-place conversion is undone: its type is back and its kept original is gone'
);

-- 22.
select is (
  (select jsonb_array_length(pairs) from public.data_dictionaries__code_lists where id = 'd4500001-0000-4000-8000-000000000001'::uuid),
  4,
  'the added value is in the list'
);

-- 23.
select is (
  (select version from public.data_dictionaries where id = 'd4400001-0000-4000-8000-000000000001'::uuid),
  2,
  'adding the value bumped the version once'
);

-- 24.
select is (
  pg_temp.create_linked_as (
    'd4000001-0000-4000-8000-000000000001'::uuid,
    'd4450001-0000-4000-8000-000000000001'::uuid,
    'd4450010-0000-4000-8000-000000000010'::uuid,
    'Kings (labels only)',
    jsonb_build_array(pg_temp.binding ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid))
  ),
  'd4450010-0000-4000-8000-000000000010'::uuid,
  'a second linked dataset over the same source returns its id'
);

-- 25.
select is (
  (select count(*)::int from public.datasets__virtual where linked_source_dataset_id = 'd4450001-0000-4000-8000-000000000001'::uuid),
  2,
  'two linked datasets read Kings'
);

-- 26.
select is (
  pg_temp.apply_as ('d4000001-0000-4000-8000-000000000001'::uuid, 'd4450001-0000-4000-8000-000000000001'::uuid, jsonb_build_array(pg_temp.binding ('d4460001-0000-4000-8000-000000000001'::uuid, 'd4600001-0000-4000-8000-000000000001'::uuid, 'd4500001-0000-4000-8000-000000000001'::uuid, '{"is_pinned":true}'))),
  'dataset_has_linked_datasets',
  'once a linked dataset reads Kings, Kings cannot be converted in place'
);
reset role;

select * from finish ();

rollback;
