\set ON_ERROR_STOP on

/**
 * Per-period (bucketed list) fields. Two checks on `concept_attributes` keep
 * a period on dataset list fields that neither name nor key a record, and a
 * trigger holds each dataset-column mapping's `bucket_column_id` to its
 * field's `bucket_grain` and to a date or timestamp column of the mapping's
 * own dataset.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values ('b4000001-0000-4000-8000-000000000001'::uuid, 'bucketed_fields@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'bucketed fields ws', 'bucketed-fields-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('b4002001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('b4003001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4002001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

-- Visits holds the values and every kind of candidate date column; Labs has a
-- date column of its own, which a Visits mapping must not borrow.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4003001-0000-4000-8000-000000000001'::uuid, 'bucketed visits', 'csv_file'::public.datasets__source_type),
  ('b4004002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4003001-0000-4000-8000-000000000001'::uuid, 'bucketed labs', 'csv_file'::public.datasets__source_type);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('b4005001-0000-4000-8000-000000000001'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'patient_id', 'patient_id', 'VARCHAR', 'VARCHAR', 'varchar', 0),
  ('b4005002-0000-4000-8000-000000000002'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'temperature', 'temperature', 'DOUBLE', 'DOUBLE', 'double', 1),
  ('b4005003-0000-4000-8000-000000000003'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_date', 'visit_date', 'DATE', 'DATE', 'date', 2),
  ('b4005004-0000-4000-8000-000000000004'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_at', 'visit_at', 'TIMESTAMP', 'TIMESTAMP', 'timestamp', 3),
  ('b4005005-0000-4000-8000-000000000005'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'visit_time', 'visit_time', 'TIME', 'TIME', 'time', 4),
  ('b4005006-0000-4000-8000-000000000006'::uuid, 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'note', 'note', 'VARCHAR', 'VARCHAR', 'varchar', 5),
  ('b4005007-0000-4000-8000-000000000007'::uuid, 'b4004002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'lab_date', 'lab_date', 'DATE', 'DATE', 'date', 0);

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('b4006001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'bucketed case type', false, 'b4007001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('b4007001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

-- Patient labels and keys the case type. Note has no period. The two
-- per-period fields are mapped by the assertions below.
insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
values
  ('b4008001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Patient', 'varchar', 'dataset_column', true, true, false, false, null),
  ('b4008002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Note', 'varchar', 'dataset_column', false, false, false, false, null),
  ('b4008003-0000-4000-8000-000000000003'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Temperature per week', 'double', 'dataset_column', false, false, true, false, 'week'),
  ('b4008004-0000-4000-8000-000000000004'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Unmapped per month', 'double', 'dataset_column', false, false, true, false, 'month');

insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008001-0000-4000-8000-000000000001'::uuid, 'first', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005001-0000-4000-8000-000000000001'::uuid);

-- A Case Types editor of the workspace, for the assertions that run as a
-- signed-in user.
insert into auth.users (id, email, aud, role)
values ('b4000002-0000-4000-8000-000000000002'::uuid, 'bucketed_fields_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('b4009001-0000-4000-8000-000000000001'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'Case type editors', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values ('b4009001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values ('b4002002-0000-4000-8000-000000000002'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4000002-0000-4000-8000-000000000002'::uuid, 'b4009001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

-- Another workspace, with a dataset, a date column, a text column, and a
-- per-period field of its own. A mapping in the first workspace must learn
-- nothing about any of them.
insert into public.workspaces (id, owner_id, name, slug)
values ('b4101001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'bucketed fields other ws', 'bucketed-fields-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('b4102001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('b4103001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4102001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner')
on conflict (id) do nothing;

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values ('b4104001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4103001-0000-4000-8000-000000000001'::uuid, 'other visits', 'csv_file'::public.datasets__source_type);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('b4105001-0000-4000-8000-000000000001'::uuid, 'b4104001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'other_date', 'other_date', 'DATE', 'DATE', 'date', 0),
  ('b4105002-0000-4000-8000-000000000002'::uuid, 'b4104001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'other_note', 'other_note', 'VARCHAR', 'VARCHAR', 'varchar', 1);

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values ('b4106001-0000-4000-8000-000000000001'::uuid, 'b4000001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'other case type', false, 'b4107001-0000-4000-8000-000000000001'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values ('b4107001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4106001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0);

insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
values
  ('b4108001-0000-4000-8000-000000000001'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4106001-0000-4000-8000-000000000001'::uuid, 'Other patient', 'varchar', 'dataset_column', true, true, false, false, null),
  ('b4108002-0000-4000-8000-000000000002'::uuid, 'b4101001-0000-4000-8000-000000000001'::uuid, 'b4106001-0000-4000-8000-000000000001'::uuid, 'Other per week', 'double', 'dataset_column', false, false, true, false, 'week');

/**
 * Runs `p_sql` and returns the hint of the error it raises, or null when it
 * raises none.
 */
create function pg_temp.hint_of_error (p_sql text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return null;
exception
  when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return v_hint;
end;
$$;

select plan (23);

-- 1.
select throws_ok (
  $t1$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Scalar per month', 'double', 'dataset_column', false, false, false, false, 'month');
  $t1$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_requires_array"',
  'a field with a period must be a list'
);

-- 2. A hand-entered field has no rows to group by period.
select throws_ok (
  $t2$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Manual per month', 'varchar', 'manual_entry', false, false, true, true, 'month');
  $t2$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a manual-entry field cannot have a period'
);

-- 3. The check runs before the label trigger, so a second label still fails
-- on the check.
select throws_ok (
  $t3$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Label per month', 'varchar', 'dataset_column', true, false, true, false, 'month');
  $t3$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a per-period field cannot name the record'
);

-- 4.
select throws_ok (
  $t4$
  insert into public.concept_attributes (workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Key per month', 'varchar', 'dataset_column', false, true, true, false, 'month');
  $t4$,
  '23514',
  'new row for relation "concept_attributes" violates check constraint "concept_attributes__bucket_grain_dataset_value_only"',
  'a per-period field cannot key the record'
);

-- 5.
select lives_ok (
  $t5$
  insert into public.concept_attributes (id, workspace_id, concept_id, name, data_type, mapping_type, is_label, is_identifier, is_array, allow_manual_edit, bucket_grain)
  values ('b4008005-0000-4000-8000-000000000005'::uuid, 'b4001001-0000-4000-8000-000000000001'::uuid, 'b4006001-0000-4000-8000-000000000001'::uuid, 'Temperature per month', 'double', 'dataset_column', false, false, true, false, 'month');
  $t5$,
  'a dataset list field takes a period'
);

-- 6.
select lives_ok (
  $t6$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008005-0000-4000-8000-000000000005'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
  $t6$,
  'a per-period field is mapped with a date column of its dataset'
);

-- 7.
select lives_ok (
  $t7$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008003-0000-4000-8000-000000000003'::uuid, 'max', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005004-0000-4000-8000-000000000004'::uuid);
  $t7$,
  'a per-period field is mapped with a timestamp column of its dataset'
);

-- 8.
select throws_ok (
  $t8$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '23514',
  'A mapping for a field with a bucket_grain needs a bucket_column_id',
  'a per-period field cannot be mapped without a date column'
);

-- 9.
select throws_ok (
  $t9$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008002-0000-4000-8000-000000000002'::uuid, 'first', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
  $t9$,
  '23514',
  'A mapping for a field without a bucket_grain cannot have a bucket_column_id',
  'a field without a period cannot be mapped with a date column'
);

-- 10.
select throws_ok (
  $t10$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005007-0000-4000-8000-000000000007'::uuid);
  $t10$,
  '23514',
  'bucket_column_id must be a column of the mapping''s dataset',
  'a date column of another dataset is refused'
);

-- 11.
select throws_ok (
  $t11$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005099-0000-4000-8000-000000000099'::uuid);
  $t11$,
  '23514',
  'bucket_column_id must be a column of the mapping''s dataset',
  'a date column that does not exist is refused'
);

-- 12.
select throws_ok (
  $t12$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid);
  $t12$,
  '23514',
  'bucket_column_id must be a date or timestamp column',
  'a text column cannot place rows in a period'
);

-- 13. A time of day has no calendar date.
select throws_ok (
  $t13$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005005-0000-4000-8000-000000000005'::uuid);
  $t13$,
  '23514',
  'bucket_column_id must be a date or timestamp column',
  'a time column cannot place rows in a period'
);

-- 14. The trigger guards updates as well as inserts.
select throws_ok (
  $t14$
  update public.attribute_mappings__dataset_column
  set bucket_column_id = null
  where concept_attribute_id = 'b4008005-0000-4000-8000-000000000005'::uuid;
  $t14$,
  '23514',
  'A mapping for a field with a bucket_grain needs a bucket_column_id',
  'a per-period mapping cannot lose its date column'
);

-- 15. The mapping names another workspace's dataset and one of its date
-- columns. The column is not looked up outside the mapping's workspace.
select throws_ok (
  $t15$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4104001-0000-4000-8000-000000000001'::uuid, 'b4105001-0000-4000-8000-000000000001'::uuid, 'b4105001-0000-4000-8000-000000000001'::uuid);
  $t15$,
  '23514',
  'bucket_column_id must be a column of the mapping''s dataset',
  'a date column from another workspace is refused'
);

-- 16. Another workspace's per-period field reads as a field without a period.
select throws_ok (
  $t16$
  insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
  values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4108002-0000-4000-8000-000000000002'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
  $t16$,
  '23514',
  'A mapping for a field without a bucket_grain cannot have a bucket_column_id',
  'a field from another workspace is not looked up'
);

-- 17.
select is (
  pg_temp.hint_of_error (
    $t17$
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008002-0000-4000-8000-000000000002'::uuid, 'first', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid, 'b4005003-0000-4000-8000-000000000003'::uuid);
    $t17$
  ),
  'bucket_column_not_allowed',
  'a date column on a field without a period carries its hint'
);

-- 18.
select is (
  pg_temp.hint_of_error (
    $t18$
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid);
    $t18$
  ),
  'bucket_column_required',
  'a missing date column carries its hint'
);

-- 19.
select is (
  pg_temp.hint_of_error (
    $t19$
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005007-0000-4000-8000-000000000007'::uuid);
    $t19$
  ),
  'bucket_column_not_in_dataset',
  'a date column of another dataset carries its hint'
);

-- 20.
select is (
  pg_temp.hint_of_error (
    $t20$
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid);
    $t20$
  ),
  'bucket_column_not_a_date',
  'a text column carries its hint'
);

-- 21. The trigger runs before RLS, so a signed-in editor reaches it and gets
-- the same answer.
select is (
  pg_temp.hint_of_error (
    $t21$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"b4000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4004001-0000-4000-8000-000000000001'::uuid, 'b4005002-0000-4000-8000-000000000002'::uuid, 'b4005006-0000-4000-8000-000000000006'::uuid);
    $t21$
  ),
  'bucket_column_not_a_date',
  'a Case Types editor gets the hint for a text column of the workspace'
);

reset role;

-- 22. A signed-in editor naming another workspace's text column learns only
-- that it is not a column of the mapping's dataset, not its data type.
select is (
  pg_temp.hint_of_error (
    $t22$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"b4000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    insert into public.attribute_mappings__dataset_column (workspace_id, concept_attribute_id, value_picker_rule_type, dataset_id, dataset_column_id, bucket_column_id)
    values ('b4001001-0000-4000-8000-000000000001'::uuid, 'b4008004-0000-4000-8000-000000000004'::uuid, 'avg', 'b4104001-0000-4000-8000-000000000001'::uuid, 'b4105002-0000-4000-8000-000000000002'::uuid, 'b4105002-0000-4000-8000-000000000002'::uuid);
    $t22$
  ),
  'bucket_column_not_in_dataset',
  'a Case Types editor learns nothing about another workspace''s column'
);

reset role;

-- 23. Retyping the date column later does not lock its mapping: an update
-- that leaves the field, the dataset, and the date column alone is not
-- checked again.
update public.dataset_columns
set data_type = 'varchar'
where id = 'b4005003-0000-4000-8000-000000000003'::uuid;

select lives_ok (
  $t23$
  update public.attribute_mappings__dataset_column
  set value_picker_rule_type = 'max'
  where concept_attribute_id = 'b4008005-0000-4000-8000-000000000005'::uuid;
  $t23$,
  'an update to an unrelated column skips the date column check'
);

select * from finish ();

rollback;
