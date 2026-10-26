\set ON_ERROR_STOP on

/**
 * Integrity rules on `concept_statuses` that hold for every caller: colors
 * are lowercase `#rrggbb`, names are trimmed, non-blank, and unique per case
 * type ignoring case, a case type's default status belongs to that case
 * type, and statuses are deleted with their case type.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values (
  'a6000001-0000-4000-8000-000000000001'::uuid,
  'statuses_integrity@test.dev',
  'authenticated',
  'authenticated'
)
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a6001001-0000-4000-8000-000000000001'::uuid,
  'a6000001-0000-4000-8000-000000000001'::uuid,
  'statuses integrity ws',
  'statuses-integrity-ws'
)
on conflict (id) do nothing;

-- Two case types, each defaulting to its own Active status.
insert into public.concepts (
  id,
  owner_id,
  workspace_id,
  name,
  allow_manual_creation,
  default_status_id
)
values
  (
    'a6002001-0000-4000-8000-000000000001'::uuid,
    'a6000001-0000-4000-8000-000000000001'::uuid,
    'a6001001-0000-4000-8000-000000000001'::uuid,
    'integrity case type a',
    true,
    'a6003001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'a6002002-0000-4000-8000-000000000002'::uuid,
    'a6000001-0000-4000-8000-000000000001'::uuid,
    'a6001001-0000-4000-8000-000000000001'::uuid,
    'integrity case type b',
    true,
    'a6003002-0000-4000-8000-000000000002'::uuid
  );

insert into public.concept_statuses (
  id,
  workspace_id,
  concept_id,
  name,
  description,
  color,
  position
)
values
  (
    'a6003001-0000-4000-8000-000000000001'::uuid,
    'a6001001-0000-4000-8000-000000000001'::uuid,
    'a6002001-0000-4000-8000-000000000001'::uuid,
    'Active',
    'Open and being worked on.',
    '#40c057',
    0
  ),
  (
    'a6003002-0000-4000-8000-000000000002'::uuid,
    'a6001001-0000-4000-8000-000000000001'::uuid,
    'a6002002-0000-4000-8000-000000000002'::uuid,
    'Active',
    null,
    '#40c057',
    0
  );

select plan (8);

-- 1. Colors are stored lowercase, so lookups never need to normalize them.
select throws_ok (
  $t1$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, 'Upper', '#40C057', 1);
  $t1$,
  '23514',
  null,
  'an uppercase hex color is rejected'
);

-- 2.
select throws_ok (
  $t2$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, 'Named color', 'green', 1);
  $t2$,
  '23514',
  null,
  'a color name instead of a hex color is rejected'
);

-- 3.
select throws_ok (
  $t3$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, '   ', '#637c95', 1);
  $t3$,
  '23514',
  null,
  'a blank status name is rejected'
);

-- 4.
select throws_ok (
  $t4$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, ' Closed', '#637c95', 1);
  $t4$,
  '23514',
  null,
  'an untrimmed status name is rejected'
);

-- 5. Data Explorer filters and chat match on the name, so case matters here.
select throws_ok (
  $t5$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, 'ACTIVE', '#637c95', 1);
  $t5$,
  '23505',
  null,
  'two statuses of one case type cannot differ only in case'
);

-- 6.
select lives_ok (
  $t6$
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values
    ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002001-0000-4000-8000-000000000001'::uuid, 'Closed', '#637c95', 1),
    ('a6001001-0000-4000-8000-000000000001'::uuid, 'a6002002-0000-4000-8000-000000000002'::uuid, 'Closed', '#637c95', 1);
  $t6$,
  'two case types can each have a status with the same name'
);

-- 7. The foreign key is deferred, so force the check inside the assertion.
select throws_ok (
  $t7$
  update public.concepts
  set default_status_id = 'a6003002-0000-4000-8000-000000000002'::uuid
  where id = 'a6002001-0000-4000-8000-000000000001'::uuid;
  set constraints all immediate;
  $t7$,
  '23503',
  null,
  'a case type cannot default to another case type''s status'
);

-- 8.
delete from public.concepts
where id = 'a6002001-0000-4000-8000-000000000001'::uuid;

select is (
  (
    select count(*)::int
    from public.concept_statuses
    where concept_id = 'a6002001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'deleting a case type deletes its statuses'
);

select * from finish ();

rollback;
