-- Verify every fixture case type got Active and Inactive, record-only values
-- became statuses with their first letter capitalized, both case types
-- default to Active, every record maps to the status matching its old text
-- (blank maps to the default), and the "Status" attribute was renamed.
do $$
begin
  if (
    select array_agg(cs.name order by cs.position)
    from public.concept_statuses cs
    where cs.concept_id = 'ab002001-0000-4000-8000-000000000001'::uuid
  ) is distinct from array['Active', 'Inactive', 'Closed', 'Escalated'] then
    raise exception 'the case type with records did not get Active, Inactive, Closed, and Escalated, in that order';
  end if;

  if (
    select array_agg(cs.name order by cs.position)
    from public.concept_statuses cs
    where cs.concept_id = 'ab002002-0000-4000-8000-000000000002'::uuid
  ) is distinct from array['Active', 'Inactive'] then
    raise exception 'the case type without records did not get exactly Active and Inactive';
  end if;

  if (
    select array_agg(cs.color order by cs.position)
    from public.concept_statuses cs
    where cs.concept_id = 'ab002001-0000-4000-8000-000000000001'::uuid
  ) is distinct from array['#40c057', '#637c95', '#637c95', '#637c95'] then
    raise exception 'Active is not green, or another status is not neutral';
  end if;

  if exists (
    select 1
    from public.concepts c
    left join public.concept_statuses cs on cs.id = c.default_status_id
    where
      c.id in (
        'ab002001-0000-4000-8000-000000000001'::uuid,
        'ab002002-0000-4000-8000-000000000002'::uuid
      ) and
      cs.name is distinct from 'Active'
  ) then
    raise exception 'a case type does not default to its Active status';
  end if;

  if exists (
    select 1
    from (
      values
        ('ab004001-0000-4000-8000-000000000001'::uuid, 'Active'),
        ('ab004002-0000-4000-8000-000000000002'::uuid, 'Closed'),
        ('ab004003-0000-4000-8000-000000000003'::uuid, 'Closed'),
        ('ab004004-0000-4000-8000-000000000004'::uuid, 'Escalated'),
        ('ab004005-0000-4000-8000-000000000005'::uuid, 'Inactive'),
        ('ab004006-0000-4000-8000-000000000006'::uuid, 'Active')
    ) as expected (record_id, status_name)
    left join public.individuals i on i.id = expected.record_id
    left join public.concept_statuses cs on cs.id = i.status_id
    where cs.name is distinct from expected.status_name
  ) then
    raise exception 'a record does not hold the status matching its old text';
  end if;

  if (
    select name from public.concept_attributes
    where id = 'ab003002-0000-4000-8000-000000000002'::uuid
  ) is distinct from 'Status (attribute)' then
    raise exception 'the attribute named Status was not renamed';
  end if;
end;
$$;

rollback;
