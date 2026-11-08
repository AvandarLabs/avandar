-- Brings stored value rules and field data types in line with the rule table
-- in `shared/models/ontology/ValuePickerRule/`. A rule its column's type does
-- not allow becomes `most_frequent`, which every type allows. Each
-- dataset-column field's `data_type` becomes the type the concept view emits
-- for it: the column's type for a list field, `double` for `sum` and `avg`,
-- `bigint` for `count`, and the column's type for every other rule.
--
-- Hand-written because `db diff` never emits DML. A mapping whose column no
-- longer exists, or belongs to another dataset, is left alone: there is no
-- type to judge it by, and the query planner already refuses it. Each
-- statement skips rows that are already right, so a re-run changes nothing.
do $$
declare
  replaced_rule_count integer;
  corrected_type_count integer;
begin
  update public.attribute_mappings__dataset_column dcm
  set
    value_picker_rule_type = 'most_frequent'
  from
    public.dataset_columns dc
  where
    dc.id = dcm.dataset_column_id and
    dc.dataset_id = dcm.dataset_id and
    (
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
          when ca.is_array then dc.data_type
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
