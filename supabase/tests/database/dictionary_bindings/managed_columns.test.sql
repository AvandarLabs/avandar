\set ON_ERROR_STOP on

/**
 * The columns conversions add: a binding's conversion fields and the check
 * that keeps a reference binding plain, the `<column>_original` link on
 * `dataset_columns`, and a linked dataset's source on `datasets__virtual`.
 * A signed-in user can neither set nor change the two managed links, and
 * still edits everything else about a column or a virtual dataset.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1000001-0000-4000-8000-000000000001'::uuid, 'conv_managed_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1000002-0000-4000-8000-000000000002'::uuid, 'conv_managed_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('d1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'conv managed ws', 'conv-managed-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1200001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid),
  ('d1200002-0000-4000-8000-000000000002'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d1300001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d1300002-0000-4000-8000-000000000002'::uuid, 'd1000002-0000-4000-8000-000000000002'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1200002-0000-4000-8000-000000000002'::uuid, 'Editor', 'Editor')
on conflict (id) do nothing;

-- The editor gets Global Editor, so they can edit every dataset here.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'd1100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'd1000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Editor';

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('d1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('d1450002-0000-4000-8000-000000000002'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1300001-0000-4000-8000-000000000001'::uuid, 'Kings (labeled)', 'virtual'::public.datasets__source_type),
  ('d1450003-0000-4000-8000-000000000003'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1300001-0000-4000-8000-000000000001'::uuid, 'Kings (codes)', 'virtual'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql)
values ('d1450002-0000-4000-8000-000000000002'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d1450001-0000-4000-8000-000000000001"');

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('d1460001-0000-4000-8000-000000000001'::uuid, 'd1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d1460003-0000-4000-8000-000000000003'::uuid, 'd1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'hosp_yn', 'hosp_yn', 'VARCHAR', 'VARCHAR', 'varchar', 1);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('d1400001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1000001-0000-4000-8000-000000000001'::uuid, 'd1300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values ('d1500001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values ('d1600001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values ('d1100001-0000-4000-8000-000000000001'::uuid, 'd1400001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, true);

-- A convert binding that keeps GENDER's original values, as an apply would
-- write it, and a reference binding with every conversion field defaulted.
insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, mode, applied_dictionary_version, keeps_original, replaced_data_type)
values ('d1470001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1450001-0000-4000-8000-000000000001'::uuid, 'd1460001-0000-4000-8000-000000000001'::uuid, 'd1400001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'convert', 1, true, 'bigint');

insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, applied_dictionary_version)
values ('d1470002-0000-4000-8000-000000000002'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'd1450001-0000-4000-8000-000000000001'::uuid, 'd1460003-0000-4000-8000-000000000003'::uuid, 'd1400001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 1);

-- The copy of GENDER that the convert binding keeps.
insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx, dictionary_binding_id)
values ('d1460002-0000-4000-8000-000000000002'::uuid, 'd1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER_original', 'BIGINT', 'BIGINT', 'bigint', 2, 'd1470001-0000-4000-8000-000000000001'::uuid);

select plan (26);

-- A binding's conversion fields.

-- 1.
select col_type_is ('public', 'dataset_columns__dictionary_bindings', 'keeps_original', 'boolean', 'keeps_original is a boolean');

-- 2.
select col_type_is ('public', 'dataset_columns__dictionary_bindings', 'value_overrides', 'jsonb', 'value_overrides is jsonb');

-- 3.
select col_type_is ('public', 'dataset_columns__dictionary_bindings', 'pinned_pairs', 'jsonb', 'pinned_pairs is jsonb');

-- 4.
select col_type_is ('public', 'dataset_columns__dictionary_bindings', 'pinned_is_ordered', 'boolean', 'pinned_is_ordered is a boolean');

-- 5.
select col_type_is ('public', 'dataset_columns__dictionary_bindings', 'replaced_data_type', 'public', 'datasets__ava_data_type', 'replaced_data_type is an Ava data type');

-- 6.
select results_eq (
  $q$
    select keeps_original, value_overrides, pinned_pairs is null, pinned_is_ordered is null, replaced_data_type is null
    from public.dataset_columns__dictionary_bindings
    where id = 'd1470002-0000-4000-8000-000000000002'::uuid
  $q$,
  $q$ values (false, '[]'::jsonb, true, true, true) $q$,
  'a binding written without conversion fields is plain'
);

-- 7.
select throws_ok (
  $t7$
  update public.dataset_columns__dictionary_bindings
  set keeps_original = true
  where id = 'd1470002-0000-4000-8000-000000000002'::uuid;
  $t7$,
  '23514',
  null,
  'a reference binding cannot keep original values'
);

-- 8.
select throws_ok (
  $t8$
  update public.dataset_columns__dictionary_bindings
  set pinned_pairs = '[]'::jsonb
  where id = 'd1470001-0000-4000-8000-000000000001'::uuid;
  $t8$,
  '23514',
  null,
  'pinned pairs need pinned_is_ordered beside them'
);

-- 9.
select throws_ok (
  $t9$
  update public.dataset_columns__dictionary_bindings
  set value_overrides = '{}'::jsonb
  where id = 'd1470001-0000-4000-8000-000000000001'::uuid;
  $t9$,
  '23514',
  null,
  'value overrides must be an array'
);

-- 10.
select throws_ok (
  $t10$
  update public.dataset_columns__dictionary_bindings
  set pinned_pairs = '{}'::jsonb, pinned_is_ordered = false
  where id = 'd1470001-0000-4000-8000-000000000001'::uuid;
  $t10$,
  '23514',
  null,
  'pinned pairs must be an array'
);

-- 11.
select lives_ok (
  $t11$
  update public.dataset_columns__dictionary_bindings
  set
    pinned_pairs = '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb,
    pinned_is_ordered = false,
    value_overrides = '[{"value":"7","action":"empty"}]'::jsonb
  where id = 'd1470001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  'a convert binding takes pinned pairs and overrides'
);

-- The `<column>_original` link.

-- 12.
select col_type_is ('public', 'dataset_columns', 'dictionary_binding_id', 'uuid', 'dataset_columns.dictionary_binding_id is a uuid');

-- 13.
select fk_ok ('public', 'dataset_columns', 'dictionary_binding_id', 'public', 'dataset_columns__dictionary_bindings', 'id', 'a kept original column names its binding');

-- 14.
select has_index ('public', 'dataset_columns', 'idx_dataset_columns__dictionary_binding_id', 'the link is indexed for the cascade');

-- 15.
select throws_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx, dictionary_binding_id)
  values ('d1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER_copy', 'BIGINT', 'BIGINT', 'bigint', 3, 'd1470001-0000-4000-8000-000000000001'::uuid);
  $t15$,
  '42501',
  'a kept original column is managed by its dictionary binding',
  'an editor cannot add a kept original column'
);
reset role;

-- 16.
select throws_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.dataset_columns set dictionary_binding_id = null where id = 'd1460002-0000-4000-8000-000000000002'::uuid;
  $t16$,
  '42501',
  'a kept original column is managed by its dictionary binding',
  'an editor cannot detach a kept original column from its binding'
);
reset role;

-- 17. A whole-row update, as the CRUD client sends, carries the same value.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.dataset_columns
  set name = 'GENDER_raw', dictionary_binding_id = 'd1470001-0000-4000-8000-000000000001'::uuid
  where id = 'd1460002-0000-4000-8000-000000000002'::uuid;
  $t17$,
  'an editor renames a kept original column'
);
reset role;

-- 18.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
  values ('d1450001-0000-4000-8000-000000000001'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'notes', 'notes', 'VARCHAR', 'VARCHAR', 'varchar', 4);
  $t18$,
  'an editor still adds an ordinary column'
);
reset role;

-- A linked dataset's source.

-- 19.
select col_type_is ('public', 'datasets__virtual', 'linked_source_dataset_id', 'uuid', 'datasets__virtual.linked_source_dataset_id is a uuid');

-- 20.
select fk_ok ('public', 'datasets__virtual', 'linked_source_dataset_id', 'public', 'datasets', 'id', 'a linked dataset names the dataset it reads');

-- 21.
select has_index ('public', 'datasets__virtual', 'idx_datasets__virtual__linked_source_dataset_id', 'a source finds its linked datasets by index');

-- 22.
select throws_ok (
  $t22$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.datasets__virtual
  set linked_source_dataset_id = 'd1450001-0000-4000-8000-000000000001'::uuid
  where dataset_id = 'd1450002-0000-4000-8000-000000000002'::uuid;
  $t22$,
  '42501',
  'a linked dataset''s source is managed',
  'an editor cannot make a virtual dataset linked'
);
reset role;

-- 23.
select throws_ok (
  $t23$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
  values ('d1450003-0000-4000-8000-000000000003'::uuid, 'd1100001-0000-4000-8000-000000000001'::uuid, 'SELECT 1', 'd1450001-0000-4000-8000-000000000001'::uuid);
  $t23$,
  '42501',
  'a linked dataset''s source is managed',
  'an editor cannot insert a linked dataset''s source'
);
reset role;

-- 24.
select lives_ok (
  $t24$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.datasets__virtual
  set raw_sql = 'SELECT "GENDER" FROM "d1450001-0000-4000-8000-000000000001"'
  where dataset_id = 'd1450002-0000-4000-8000-000000000002'::uuid;
  $t24$,
  'an editor still edits a virtual dataset''s SQL'
);
reset role;

-- Cascades, run as the table owner.

delete from public.dataset_columns__dictionary_bindings
where id = 'd1470001-0000-4000-8000-000000000001'::uuid;

-- 25.
select is (
  (
    select count(*)::int
    from public.dataset_columns
    where dataset_id = 'd1450001-0000-4000-8000-000000000001'::uuid and dictionary_binding_id is not null
  ),
  0,
  'deleting a binding removes the original column it kept'
);

update public.datasets__virtual
set linked_source_dataset_id = 'd1450001-0000-4000-8000-000000000001'::uuid
where dataset_id = 'd1450002-0000-4000-8000-000000000002'::uuid;

delete from public.datasets
where id = 'd1450001-0000-4000-8000-000000000001'::uuid;

-- 26.
select is (
  (
    select linked_source_dataset_id
    from public.datasets__virtual
    where dataset_id = 'd1450002-0000-4000-8000-000000000002'::uuid
  ),
  null::uuid,
  'deleting the source keeps the linked dataset and clears its source'
);

select * from finish ();

rollback;
