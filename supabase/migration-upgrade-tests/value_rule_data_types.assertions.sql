-- Verify every field stores its rule's output type, every disallowed rule
-- and every identifier's rule became most_frequent, rows the migration
-- cannot judge were left alone, the case type that breaks the identifier
-- rule was corrected anyway, the migration wrote only the rows it had to,
-- and the label-and-identifier trigger is enabled again. Every fixture field
-- and mapping is listed, so a missing row fails too.
create temp table expected_fields (
  attribute_id uuid primary key,
  data_type text not null,
  is_written boolean not null
) on commit drop;

insert into expected_fields (attribute_id, data_type, is_written)
values
  ('ae003001-0000-4000-8000-000000000001'::uuid, 'varchar', false),
  ('ae003002-0000-4000-8000-000000000002'::uuid, 'bigint', true),
  ('ae003003-0000-4000-8000-000000000003'::uuid, 'bigint', true),
  ('ae003004-0000-4000-8000-000000000004'::uuid, 'double', true),
  ('ae003005-0000-4000-8000-000000000005'::uuid, 'date', false),
  ('ae003006-0000-4000-8000-000000000006'::uuid, 'varchar', false),
  ('ae003007-0000-4000-8000-000000000007'::uuid, 'varchar', false),
  ('ae003008-0000-4000-8000-000000000008'::uuid, 'boolean', false),
  ('ae003009-0000-4000-8000-000000000009'::uuid, 'varchar', false),
  ('ae003010-0000-4000-8000-000000000010'::uuid, 'varchar', false),
  ('ae003011-0000-4000-8000-000000000011'::uuid, 'varchar', false),
  ('ae003012-0000-4000-8000-000000000012'::uuid, 'bigint', false),
  ('ae003013-0000-4000-8000-000000000013'::uuid, 'varchar', false),
  ('ae003014-0000-4000-8000-000000000014'::uuid, 'varchar', false),
  ('ae003015-0000-4000-8000-000000000015'::uuid, 'double', true),
  ('ae003016-0000-4000-8000-000000000016'::uuid, 'date', false),
  ('ae003017-0000-4000-8000-000000000017'::uuid, 'double', false),
  ('ae003101-0000-4000-8000-000000000101'::uuid, 'varchar', false),
  ('ae003102-0000-4000-8000-000000000102'::uuid, 'varchar', false),
  ('ae003103-0000-4000-8000-000000000103'::uuid, 'bigint', true),
  ('ae003201-0000-4000-8000-000000000201'::uuid, 'varchar', false);

create temp table expected_mappings (
  mapping_id uuid primary key,
  rule_type text not null,
  is_written boolean not null
) on commit drop;

insert into expected_mappings (mapping_id, rule_type, is_written)
values
  ('ae004001-0000-4000-8000-000000000001'::uuid, 'most_frequent', false),
  ('ae004002-0000-4000-8000-000000000002'::uuid, 'count', false),
  ('ae004003-0000-4000-8000-000000000003'::uuid, 'count', false),
  ('ae004004-0000-4000-8000-000000000004'::uuid, 'sum', false),
  ('ae004005-0000-4000-8000-000000000005'::uuid, 'max', false),
  ('ae004006-0000-4000-8000-000000000006'::uuid, 'min', false),
  ('ae004007-0000-4000-8000-000000000007'::uuid, 'most_frequent', true),
  ('ae004008-0000-4000-8000-000000000008'::uuid, 'most_frequent', true),
  ('ae004009-0000-4000-8000-000000000009'::uuid, 'most_frequent', true),
  ('ae004010-0000-4000-8000-000000000010'::uuid, 'count', false),
  ('ae004012-0000-4000-8000-000000000012'::uuid, 'sum', false),
  ('ae004013-0000-4000-8000-000000000013'::uuid, 'sum', false),
  ('ae004014-0000-4000-8000-000000000014'::uuid, 'sum', false),
  ('ae004015-0000-4000-8000-000000000015'::uuid, 'avg', false),
  ('ae004016-0000-4000-8000-000000000016'::uuid, 'first', false),
  ('ae004017-0000-4000-8000-000000000017'::uuid, 'sum', false),
  ('ae004101-0000-4000-8000-000000000101'::uuid, 'most_frequent', false),
  ('ae004102-0000-4000-8000-000000000102'::uuid, 'most_frequent', false),
  ('ae004103-0000-4000-8000-000000000103'::uuid, 'count', false),
  ('ae004201-0000-4000-8000-000000000201'::uuid, 'most_frequent', true);

do $$
declare
  mismatch record;
begin
  for mismatch in
    select
      expected.attribute_id,
      ca.data_type::text as actual_data_type,
      expected.data_type as expected_data_type
    from
      expected_fields expected
      left join public.concept_attributes ca on ca.id = expected.attribute_id
    where
      ca.data_type::text is distinct from expected.data_type
  loop
    raise exception 'field % stores %, expected %',
      mismatch.attribute_id, mismatch.actual_data_type, mismatch.expected_data_type;
  end loop;

  for mismatch in
    select
      expected.mapping_id,
      dcm.value_picker_rule_type::text as actual_rule_type,
      expected.rule_type as expected_rule_type
    from
      expected_mappings expected
      left join public.attribute_mappings__dataset_column dcm on dcm.id = expected.mapping_id
    where
      dcm.value_picker_rule_type::text is distinct from expected.rule_type
  loop
    raise exception 'mapping % has rule %, expected %',
      mismatch.mapping_id, mismatch.actual_rule_type, mismatch.expected_rule_type;
  end loop;

  -- A written row's `updated_at` moved off the fixture's old value.
  for mismatch in
    select
      expected.attribute_id,
      expected.is_written
    from
      expected_fields expected
      left join public.concept_attributes ca on ca.id = expected.attribute_id
    where
      (ca.updated_at <> '2020-01-01'::timestamptz) is distinct from expected.is_written
  loop
    raise exception 'field % was %',
      mismatch.attribute_id,
      case when mismatch.is_written then 'not written' else 'written' end;
  end loop;

  for mismatch in
    select
      expected.mapping_id,
      expected.is_written
    from
      expected_mappings expected
      left join public.attribute_mappings__dataset_column dcm on dcm.id = expected.mapping_id
    where
      (dcm.updated_at <> '2020-01-01'::timestamptz) is distinct from expected.is_written
  loop
    raise exception 'mapping % was %',
      mismatch.mapping_id,
      case when mismatch.is_written then 'not written' else 'written' end;
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

  -- The read-only check run against a database after this migration. It
  -- skips what the migration leaves alone, so it must find nothing here,
  -- where those rows exist on purpose.
  if (
    select
      count(*)
    from
      public.concept_attributes a
      join public.attribute_mappings__dataset_column m on m.concept_attribute_id = a.id
      join public.dataset_columns c on c.id = m.dataset_column_id and
        c.dataset_id = m.dataset_id
    where
      a.mapping_type = 'dataset_column' and
      (
        (
          m.value_picker_rule_type in ('sum', 'avg') and
          c.data_type not in ('bigint', 'double')
        ) or
        (
          m.value_picker_rule_type in ('max', 'min') and
          c.data_type = 'boolean'
        ) or
        (
          a.is_identifier and
          m.value_picker_rule_type <> 'most_frequent'
        ) or
        a.data_type is distinct from (
          case
            when a.is_array or a.is_identifier then c.data_type
            when m.value_picker_rule_type in ('sum', 'avg') then 'double'::public.datasets__ava_data_type
            when m.value_picker_rule_type = 'count' then 'bigint'::public.datasets__ava_data_type
            else c.data_type
          end
        )
      )
  ) <> 0 then
    raise exception 'the post-migration check found fields the migration should have corrected';
  end if;
end;
$$;

rollback;
