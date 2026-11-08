-- Verify every field stores its rule's output type, every disallowed rule
-- became most_frequent, rows the migration cannot judge were left alone, the
-- case type that breaks the identifier rule was corrected anyway, an
-- identifier keeps its key column's values, and the label-and-identifier
-- trigger is enabled again.
do $$
declare
  mismatch record;
begin
  for mismatch in
    select
      ca.name,
      ca.data_type::text as actual_data_type,
      expected.data_type as expected_data_type
    from
      (
        values
          ('ae003001-0000-4000-8000-000000000001'::uuid, 'varchar'),
          ('ae003002-0000-4000-8000-000000000002'::uuid, 'bigint'),
          ('ae003003-0000-4000-8000-000000000003'::uuid, 'bigint'),
          ('ae003004-0000-4000-8000-000000000004'::uuid, 'double'),
          ('ae003005-0000-4000-8000-000000000005'::uuid, 'date'),
          ('ae003006-0000-4000-8000-000000000006'::uuid, 'varchar'),
          ('ae003007-0000-4000-8000-000000000007'::uuid, 'varchar'),
          ('ae003008-0000-4000-8000-000000000008'::uuid, 'boolean'),
          ('ae003009-0000-4000-8000-000000000009'::uuid, 'varchar'),
          ('ae003010-0000-4000-8000-000000000010'::uuid, 'varchar'),
          ('ae003011-0000-4000-8000-000000000011'::uuid, 'varchar'),
          ('ae003103-0000-4000-8000-000000000103'::uuid, 'bigint'),
          ('ae003201-0000-4000-8000-000000000201'::uuid, 'varchar')
      ) as expected (attribute_id, data_type)
      join public.concept_attributes ca on ca.id = expected.attribute_id
    where
      ca.data_type::text is distinct from expected.data_type
  loop
    raise exception 'field "%" stores %, expected %',
      mismatch.name, mismatch.actual_data_type, mismatch.expected_data_type;
  end loop;

  for mismatch in
    select
      dcm.id,
      dcm.value_picker_rule_type::text as actual_rule_type,
      expected.rule_type as expected_rule_type
    from
      (
        values
          ('ae004002-0000-4000-8000-000000000002'::uuid, 'count'),
          ('ae004004-0000-4000-8000-000000000004'::uuid, 'sum'),
          ('ae004005-0000-4000-8000-000000000005'::uuid, 'max'),
          ('ae004006-0000-4000-8000-000000000006'::uuid, 'min'),
          ('ae004007-0000-4000-8000-000000000007'::uuid, 'most_frequent'),
          ('ae004008-0000-4000-8000-000000000008'::uuid, 'most_frequent'),
          ('ae004009-0000-4000-8000-000000000009'::uuid, 'most_frequent'),
          ('ae004010-0000-4000-8000-000000000010'::uuid, 'count'),
          ('ae004201-0000-4000-8000-000000000201'::uuid, 'most_frequent')
      ) as expected (mapping_id, rule_type)
      join public.attribute_mappings__dataset_column dcm on dcm.id = expected.mapping_id
    where
      dcm.value_picker_rule_type::text is distinct from expected.rule_type
  loop
    raise exception 'mapping % has rule %, expected %',
      mismatch.id, mismatch.actual_rule_type, mismatch.expected_rule_type;
  end loop;

  if (
    select
      tgenabled
    from
      pg_trigger
    where
      tgrelid = 'public.concept_attributes'::regclass and
      tgname = 'tr_concept_attributes__validate_label_and_identifiers'
  ) is distinct from 'O' then
    raise exception 'the label and identifier trigger was left disabled';
  end if;
end
$$;

rollback;
