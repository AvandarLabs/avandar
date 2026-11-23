-- Case types the way authoring left them before value rules were typed:
-- every field's `data_type` is its column's type whatever its rule, and some
-- rules are ones the column's type no longer allows. The schema did not
-- change, so no table is rebuilt. Every fixture id starts with `ae`.
--
-- Fixtures the migration must leave alone, beside the ones it corrects: a
-- list field whose allowed rule would change a single field's type, a
-- mapping that names a column of another dataset, a mapping whose column no
-- longer exists, and manual-entry fields, one with a leftover dataset-column
-- mapping. The second case type maps two identifier fields into one dataset,
-- which the label-and-identifier trigger refuses on any update. The third
-- case type's identifier was stored with `count`, so it shows a number
-- instead of the key.
--
-- Fields and mappings are inserted with an old `updated_at`, which an insert
-- keeps, so the assertions can tell which rows the migration wrote.
begin;

insert into auth.users (id, email, aud, role)
values ('ae000001-0000-4000-8000-000000000001'::uuid, 'value_rule_types@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'value rule types ws', 'value-rule-types-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('ae001101-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('ae001201-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae001101-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

-- The second dataset has no columns. Mapping `ae004013` names it with a
-- column of the first.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001201-0000-4000-8000-000000000001'::uuid, 'value rule types dataset', 'csv_file'::public.datasets__source_type),
  ('ae005002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001201-0000-4000-8000-000000000001'::uuid, 'value rule types other dataset', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

-- One column of each type the fixtures need.
insert into public.dataset_columns (
  id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
)
values
  ('ae006001-0000-4000-8000-000000000001'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'case_id', 'case_id', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('ae006002-0000-4000-8000-000000000002'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'district', 'district', 'VARCHAR', 'VARCHAR', 'varchar', 1),
  ('ae006003-0000-4000-8000-000000000003'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'visits', 'visits', 'BIGINT', 'BIGINT', 'bigint', 2),
  ('ae006004-0000-4000-8000-000000000004'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'weight', 'weight', 'DOUBLE', 'DOUBLE', 'double', 3),
  ('ae006005-0000-4000-8000-000000000005'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'seen_on', 'seen_on', 'DATE', 'DATE', 'date', 4),
  ('ae006006-0000-4000-8000-000000000006'::uuid, 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'vaccinated', 'vaccinated', 'BOOLEAN', 'BOOLEAN', 'boolean', 5);

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('ae002001-0000-4000-8000-000000000001'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'value rule case type', false, 'ae007001-0000-4000-8000-000000000001'::uuid),
  ('ae002002-0000-4000-8000-000000000002'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'case type with two keys in one dataset', false, 'ae007002-0000-4000-8000-000000000002'::uuid),
  ('ae002003-0000-4000-8000-000000000003'::uuid, 'ae000001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'case type with a counted identifier', false, 'ae007003-0000-4000-8000-000000000003'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('ae007001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('ae007002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0),
  ('ae007003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002003-0000-4000-8000-000000000003'::uuid, 'Active', '#40c057', 0);

-- Every field's `data_type` is its column's type, as authoring stored it.
-- Attributes go in before mappings, as `rpc_concepts__create` inserts them,
-- so the identifier check passes on insert.
insert into public.concept_attributes (
  id, workspace_id, concept_id, name, data_type, mapping_type,
  is_label, is_identifier, is_array, allow_manual_edit, updated_at
)
values
  ('ae003001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Case ID', 'varchar', 'dataset_column', true, true, false, false, '2020-01-01'),
  ('ae003002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'District count', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Weight count', 'double', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Total visits', 'bigint', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003005-0000-4000-8000-000000000005'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Latest visit', 'date', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003006-0000-4000-8000-000000000006'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'First district', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'District total', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003008-0000-4000-8000-000000000008'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Ever vaccinated', 'boolean', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003009-0000-4000-8000-000000000009'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Districts', 'varchar', 'dataset_column', false, false, true, false, '2020-01-01'),
  ('ae003010-0000-4000-8000-000000000010'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Lost column count', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003011-0000-4000-8000-000000000011'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Notes', 'varchar', 'manual_entry', false, false, false, false, '2020-01-01'),
  ('ae003012-0000-4000-8000-000000000012'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Visit counts', 'bigint', 'dataset_column', false, false, true, false, '2020-01-01'),
  ('ae003013-0000-4000-8000-000000000013'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Other dataset total', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003014-0000-4000-8000-000000000014'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Leftover notes', 'varchar', 'manual_entry', false, false, false, false, '2020-01-01'),
  ('ae003015-0000-4000-8000-000000000015'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Average visits', 'bigint', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003016-0000-4000-8000-000000000016'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'First seen', 'date', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003017-0000-4000-8000-000000000017'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002001-0000-4000-8000-000000000001'::uuid, 'Total weight', 'double', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003101-0000-4000-8000-000000000101'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key A', 'varchar', 'dataset_column', true, true, false, false, '2020-01-01'),
  ('ae003102-0000-4000-8000-000000000102'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'Key B', 'varchar', 'dataset_column', false, true, false, false, '2020-01-01'),
  ('ae003103-0000-4000-8000-000000000103'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002002-0000-4000-8000-000000000002'::uuid, 'District count', 'varchar', 'dataset_column', false, false, false, false, '2020-01-01'),
  ('ae003201-0000-4000-8000-000000000201'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae002003-0000-4000-8000-000000000003'::uuid, 'Case ID', 'varchar', 'dataset_column', true, true, false, false, '2020-01-01');

-- Mapping `ae004010` names a column that no longer exists, and `ae004014`
-- is left over on a manual-entry field.
insert into public.attribute_mappings__dataset_column (
  id, workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, updated_at
)
values
  ('ae004001-0000-4000-8000-000000000001'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003001-0000-4000-8000-000000000001'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006001-0000-4000-8000-000000000001'::uuid, '2020-01-01'),
  ('ae004002-0000-4000-8000-000000000002'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003002-0000-4000-8000-000000000002'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004003-0000-4000-8000-000000000003'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003003-0000-4000-8000-000000000003'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006004-0000-4000-8000-000000000004'::uuid, '2020-01-01'),
  ('ae004004-0000-4000-8000-000000000004'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003004-0000-4000-8000-000000000004'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006003-0000-4000-8000-000000000003'::uuid, '2020-01-01'),
  ('ae004005-0000-4000-8000-000000000005'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003005-0000-4000-8000-000000000005'::uuid, 'max', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006005-0000-4000-8000-000000000005'::uuid, '2020-01-01'),
  ('ae004006-0000-4000-8000-000000000006'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003006-0000-4000-8000-000000000006'::uuid, 'min', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004007-0000-4000-8000-000000000007'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003007-0000-4000-8000-000000000007'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004008-0000-4000-8000-000000000008'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003008-0000-4000-8000-000000000008'::uuid, 'max', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006006-0000-4000-8000-000000000006'::uuid, '2020-01-01'),
  ('ae004009-0000-4000-8000-000000000009'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003009-0000-4000-8000-000000000009'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004010-0000-4000-8000-000000000010'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003010-0000-4000-8000-000000000010'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006099-0000-4000-8000-000000000099'::uuid, '2020-01-01'),
  ('ae004012-0000-4000-8000-000000000012'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003012-0000-4000-8000-000000000012'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006003-0000-4000-8000-000000000003'::uuid, '2020-01-01'),
  ('ae004013-0000-4000-8000-000000000013'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003013-0000-4000-8000-000000000013'::uuid, 'sum', 'ae005002-0000-4000-8000-000000000002'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004014-0000-4000-8000-000000000014'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003014-0000-4000-8000-000000000014'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004015-0000-4000-8000-000000000015'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003015-0000-4000-8000-000000000015'::uuid, 'avg', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006003-0000-4000-8000-000000000003'::uuid, '2020-01-01'),
  ('ae004016-0000-4000-8000-000000000016'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003016-0000-4000-8000-000000000016'::uuid, 'first', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006005-0000-4000-8000-000000000005'::uuid, '2020-01-01'),
  ('ae004017-0000-4000-8000-000000000017'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003017-0000-4000-8000-000000000017'::uuid, 'sum', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006004-0000-4000-8000-000000000004'::uuid, '2020-01-01'),
  ('ae004101-0000-4000-8000-000000000101'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003101-0000-4000-8000-000000000101'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006001-0000-4000-8000-000000000001'::uuid, '2020-01-01'),
  ('ae004102-0000-4000-8000-000000000102'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003102-0000-4000-8000-000000000102'::uuid, 'most_frequent', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004103-0000-4000-8000-000000000103'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003103-0000-4000-8000-000000000103'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006002-0000-4000-8000-000000000002'::uuid, '2020-01-01'),
  ('ae004201-0000-4000-8000-000000000201'::uuid, 'ae001001-0000-4000-8000-000000000001'::uuid, 'ae003201-0000-4000-8000-000000000201'::uuid, 'count', 'ae005001-0000-4000-8000-000000000001'::uuid, 'ae006001-0000-4000-8000-000000000001'::uuid, '2020-01-01');
