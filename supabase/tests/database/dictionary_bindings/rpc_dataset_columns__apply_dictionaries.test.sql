\set ON_ERROR_STOP on

/**
 * `rpc_dataset_columns__apply_dictionaries` replaces one dataset's
 * dictionary bindings in one transaction. Only an editor of the dataset who
 * can read dictionaries may call it, every column, entry, and code list must
 * belong where the binding says, and only reference bindings are accepted.
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

-- Runs one apply as the given user and returns its hint, or 'no error'.
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

-- One binding of the sex entry, as JSON, for a column.
create function pg_temp.sex_binding (p_column_id uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'dataset_column_id', p_column_id,
    'dictionary_id', 'dc400001-0000-4000-8000-000000000001',
    'entry_id', 'dc600001-0000-4000-8000-000000000001',
    'code_list_id', 'dc500001-0000-4000-8000-000000000001',
    'mode', 'reference',
    'direction', 'decode'
  );
$$;

insert into auth.users (id, email, aud, role)
values
  ('dc000001-0000-4000-8000-000000000001'::uuid, 'bind_editor@test.dev', 'authenticated', 'authenticated'),
  ('dc000002-0000-4000-8000-000000000002'::uuid, 'bind_viewer@test.dev', 'authenticated', 'authenticated'),
  ('dc000003-0000-4000-8000-000000000003'::uuid, 'bind_outsider@test.dev', 'authenticated', 'authenticated'),
  ('dc000004-0000-4000-8000-000000000004'::uuid, 'bind_shared_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- The editor owns the workspace; the outsider owns another.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'bind ws', 'bind-ws'),
  ('dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'bind other ws', 'bind-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('dc200001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid),
  ('dc200002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000002-0000-4000-8000-000000000002'::uuid),
  ('dc200003-0000-4000-8000-000000000003'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid),
  ('dc200004-0000-4000-8000-000000000004'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('dc300001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200001-0000-4000-8000-000000000001'::uuid, 'Editor', 'Editor'),
  ('dc300002-0000-4000-8000-000000000002'::uuid, 'dc000002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('dc300003-0000-4000-8000-000000000003'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider'),
  ('dc300004-0000-4000-8000-000000000004'::uuid, 'dc000004-0000-4000-8000-000000000004'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc200004-0000-4000-8000-000000000004'::uuid, 'Shared editor', 'Shared editor')
on conflict (id) do nothing;

-- The viewer gets Global Viewer. The shared editor has no app role at all:
-- only a share on the first dataset.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'dc000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('dc450002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  'dc450001-0000-4000-8000-000000000001'::uuid,
  'user'::public.share_principal_type,
  'dc000004-0000-4000-8000-000000000004'::uuid,
  'editor'::public.role_level
);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('dc460001-0000-4000-8000-000000000001'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('dc460002-0000-4000-8000-000000000002'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'CaseNo', 'CaseNo', 'VARCHAR', 'VARCHAR', 'varchar', 1),
  ('dc460003-0000-4000-8000-000000000003'::uuid, 'dc450002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('dc400001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'NYS codes'),
  ('dc400002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc000001-0000-4000-8000-000000000001'::uuid, 'dc300001-0000-4000-8000-000000000001'::uuid, 'Other codes'),
  ('dc400009-0000-4000-8000-000000000009'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc000003-0000-4000-8000-000000000003'::uuid, 'dc300003-0000-4000-8000-000000000003'::uuid, 'Elsewhere')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values (
  'dc500001-0000-4000-8000-000000000001'::uuid,
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dc400001-0000-4000-8000-000000000001'::uuid,
  'Sex (1/2/9)',
  '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb
);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('dc600001-0000-4000-8000-000000000001'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('dc600002-0000-4000-8000-000000000002'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400001-0000-4000-8000-000000000001'::uuid, 'case_id', 'identifier', 1),
  ('dc600003-0000-4000-8000-000000000003'::uuid, 'dc100001-0000-4000-8000-000000000001'::uuid, 'dc400002-0000-4000-8000-000000000002'::uuid, 'sex', 'text', 0),
  ('dc600009-0000-4000-8000-000000000009'::uuid, 'dc100002-0000-4000-8000-000000000002'::uuid, 'dc400009-0000-4000-8000-000000000009'::uuid, 'sex', 'text', 0);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values (
  'dc100001-0000-4000-8000-000000000001'::uuid,
  'dc400001-0000-4000-8000-000000000001'::uuid,
  'dc600001-0000-4000-8000-000000000001'::uuid,
  'dc500001-0000-4000-8000-000000000001'::uuid,
  true
);


select plan (25);

-- Refusals. None of them changes anything.

-- 1.
select is (
  pg_temp.apply_as ('dc000002-0000-4000-8000-000000000002'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a viewer of the dataset cannot apply dictionaries to it'
);
reset role;

-- 2.
select is (
  pg_temp.apply_as ('dc000003-0000-4000-8000-000000000003'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a user outside the workspace cannot apply dictionaries'
);
reset role;

-- 3.
select is (
  pg_temp.apply_as ('dc000001-0000-4000-8000-000000000001'::uuid, 'dc45ffff-0000-4000-8000-00000000ffff'::uuid, '[]'::jsonb),
  'dataset_editor_required',
  'a dataset that does not exist is refused like a forbidden one'
);
reset role;

-- 4.
select is (
  pg_temp.apply_as ('dc000004-0000-4000-8000-000000000004'::uuid, 'dc450001-0000-4000-8000-000000000001'::uuid, '[]'::jsonb),
  'dictionary_viewer_required',
  'an editor of the dataset with no Data Sources role cannot read dictionaries to apply'
);
reset role;

-- 5.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460003-0000-4000-8000-000000000003'::uuid))
  ),
  'column_not_in_dataset',
  'a column of another dataset is refused'
);
reset role;

-- 6.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"dictionary_id":"dc400009-0000-4000-8000-000000000009","entry_id":"dc600009-0000-4000-8000-000000000009","code_list_id":null}'::jsonb)
  ),
  'entry_not_in_dictionary',
  'an entry of another workspace''s dictionary is refused'
);
reset role;

-- 7.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"entry_id":"dc600003-0000-4000-8000-000000000003","code_list_id":null}'::jsonb)
  ),
  'entry_not_in_dictionary',
  'an entry of a different dictionary than the binding names is refused'
);
reset role;

-- 8.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460002-0000-4000-8000-000000000002'::uuid) || '{"entry_id":"dc600002-0000-4000-8000-000000000002"}'::jsonb)
  ),
  'code_list_not_in_entry',
  'a code list the entry does not use is refused'
);
reset role;

-- 9.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"mode":"convert"}'::jsonb)
  ),
  'binding_mode_unsupported',
  'a convert binding is refused'
);
reset role;

-- 10.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid)
    )
  ),
  'binding_payload_invalid',
  'one column bound twice is refused'
);
reset role;

-- 11.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"direction":"sideways"}'::jsonb)
  ),
  'binding_payload_invalid',
  'an unknown direction is refused'
);
reset role;

-- 12.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    '{}'::jsonb
  ),
  'binding_payload_invalid',
  'an object instead of an array is refused'
);
reset role;

-- 13.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    '[1]'::jsonb
  ),
  'binding_payload_invalid',
  'an element that is not an object is refused'
);
reset role;

-- 14.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"entry_id":"not-a-uuid"}'::jsonb)
  ),
  'binding_payload_invalid',
  'a malformed id is refused'
);
reset role;

-- 15.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings where workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid),
  0,
  'no refusal wrote a binding'
);

-- Applies.

-- 16.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460002-0000-4000-8000-000000000002'::uuid) || '{"entry_id":"dc600002-0000-4000-8000-000000000002","code_list_id":null}'::jsonb
    )
  ),
  'no error',
  'an editor attaches a code list and a description'
);
reset role;

-- 17.
select results_eq (
  $q$
    select dataset_column_id, mode::text, applied_dictionary_version
    from public.dataset_columns__dictionary_bindings
    where workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid
    order by dataset_column_id
  $q$,
  $q$
    values
      ('dc460001-0000-4000-8000-000000000001'::uuid, 'reference', 1),
      ('dc460002-0000-4000-8000-000000000002'::uuid, 'reference', 1)
  $q$,
  'both bindings are stored as reference with the dictionary''s version'
);

-- 18.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(
      pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid),
      pg_temp.sex_binding ('dc460003-0000-4000-8000-000000000003'::uuid)
    )
  ),
  'column_not_in_dataset',
  'an apply with one bad column is refused'
);
reset role;

-- 19. A statement sees the data as it was when it began, so each check
-- below reads the bindings in a statement of its own.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings where workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid),
  2,
  'a refused apply leaves the earlier bindings as they were'
);

-- 20.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid))
  ),
  'no error',
  'an editor applies a smaller set'
);
reset role;

-- 21.
select results_eq (
  'select dataset_column_id from public.dataset_columns__dictionary_bindings where workspace_id = ''dc100001-0000-4000-8000-000000000001''::uuid',
  $$values ('dc460001-0000-4000-8000-000000000001'::uuid)$$,
  'the smaller set replaces the dataset''s bindings'
);

-- Remembers the GENDER binding's row, to check that a re-apply updates it.
create temp table gender_binding as
select id
from public.dataset_columns__dictionary_bindings
where dataset_column_id = 'dc460001-0000-4000-8000-000000000001'::uuid;

-- 22.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    jsonb_build_array(pg_temp.sex_binding ('dc460001-0000-4000-8000-000000000001'::uuid) || '{"entry_id":"dc600002-0000-4000-8000-000000000002","code_list_id":null}'::jsonb)
  ),
  'no error',
  'an editor binds the column to a different entry'
);
reset role;

-- 23.
select results_eq (
  $q$
    select id, entry_id
    from public.dataset_columns__dictionary_bindings
    where dataset_column_id = 'dc460001-0000-4000-8000-000000000001'::uuid
  $q$,
  $q$
    select id, 'dc600002-0000-4000-8000-000000000002'::uuid
    from pg_temp.gender_binding
  $q$,
  'a re-apply updates the column''s binding in place with the new entry'
);

-- 24.
select is (
  pg_temp.apply_as (
    'dc000001-0000-4000-8000-000000000001'::uuid,
    'dc450001-0000-4000-8000-000000000001'::uuid,
    '[]'::jsonb
  ),
  'no error',
  'an editor applies an empty set'
);
reset role;

-- 25.
select is (
  (select count(*)::int from public.dataset_columns__dictionary_bindings where workspace_id = 'dc100001-0000-4000-8000-000000000001'::uuid),
  0,
  'an empty set removes every binding'
);

select * from finish ();

rollback;
