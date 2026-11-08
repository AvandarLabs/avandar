-- Brings stored value rules and field data types in line with the rule table
-- in `shared/models/ontology/ValuePickerRule/`. A rule its column's type does
-- not allow becomes `most_frequent`, which every type allows. Each
-- dataset-column field's `data_type` becomes the type the concept view emits
-- for it: the column's type for a list field or an identifier, `double` for
-- `sum` and `avg`, `bigint` for `count`, and the column's type for every other
-- rule.
--
-- An identifier field's rule also becomes `most_frequent`, whatever it was.
-- An identifier shows the record's key, so reducing its column with `count` or
-- `sum` would show a number instead, and so would a label that falls back to
-- the identifier. Authoring already saves every identifier this way.
--
-- Hand-written because `db diff` never emits DML. A mapping whose column no
-- longer exists, or belongs to another dataset, is left alone, and so is its
-- field. The concept planner refuses a mapping whose column is gone, and a
-- mapping whose column belongs to another dataset has no type that applies
-- to it. Such a mapping keeps its rule even on an identifier. Manual-entry
-- fields, and any dataset-column mapping left over on one, are left alone
-- too. Each statement skips rows that are already right, so a re-run changes
-- nothing.
do $$
declare
  replaced_rule_count integer;
  corrected_type_count integer;
begin
  -- Step 1 locks mapping rows before it touches `concept_attributes`, and
  -- turning its trigger off later takes a share row exclusive lock on that
  -- table. Taking that lock first, rather than upgrading to it midway, keeps
  -- a session writing both tables from deadlocking against this migration.
  lock table public.concept_attributes in share row exclusive mode;

  update public.attribute_mappings__dataset_column dcm
  set
    value_picker_rule_type = 'most_frequent'
  from
    public.dataset_columns dc,
    public.concept_attributes ca
  where
    dc.id = dcm.dataset_column_id and
    dc.dataset_id = dcm.dataset_id and
    ca.id = dcm.concept_attribute_id and
    ca.mapping_type = 'dataset_column' and
    (
      (
        ca.is_identifier and
        dcm.value_picker_rule_type <> 'most_frequent'
      ) or
      (
        dcm.value_picker_rule_type in ('sum', 'avg') and
        dc.data_type not in ('bigint', 'double')
      ) or
      (
        dcm.value_picker_rule_type in ('max', 'min') and
        dc.data_type = 'boolean'
      )
    );
  get diagnostics replaced_rule_count = row_count;

  -- The update below changes only `data_type`, which the label and
  -- identifier check never reads. That check runs after every update and
  -- inspects the whole case type, so one case type that already breaks it
  -- would otherwise abort this migration for every workspace.
  alter table public.concept_attributes
  disable trigger tr_concept_attributes__validate_label_and_identifiers;

  with
    field_type as (
      select
        ca.id,
        case
          when ca.is_array or ca.is_identifier then dc.data_type
          when dcm.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
          when dcm.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
          else dc.data_type
        end as output_data_type
      from
        public.concept_attributes ca
        join public.attribute_mappings__dataset_column dcm on dcm.concept_attribute_id = ca.id
        join public.dataset_columns dc on dc.id = dcm.dataset_column_id and
          dc.dataset_id = dcm.dataset_id
      where
        ca.mapping_type = 'dataset_column'
    )
  update public.concept_attributes ca
  set
    data_type = field_type.output_data_type
  from
    field_type
  where
    field_type.id = ca.id and
    ca.data_type is distinct from field_type.output_data_type;
  get diagnostics corrected_type_count = row_count;

  alter table public.concept_attributes
  enable trigger tr_concept_attributes__validate_label_and_identifiers;

  raise notice 'value rules replaced with most_frequent: %; field data types corrected: %',
    replaced_rule_count, corrected_type_count;
end
$$;
