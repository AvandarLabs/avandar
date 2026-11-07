\set ON_ERROR_STOP on

/**
 * A record's status: it starts in its case type's default when an insert
 * names none, it can only be a status of its own case type, and a status
 * that records use cannot be deleted. Changing it needs Case Records editor.
 * A Case Types editor can still sync records (insert them without a status,
 * rename them) without being able to change a status.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a8000001-0000-4000-8000-000000000001'::uuid, 'status_guard_owner@test.dev', 'authenticated', 'authenticated'),
  ('a8000002-0000-4000-8000-000000000002'::uuid, 'status_guard_types@test.dev', 'authenticated', 'authenticated'),
  ('a8000003-0000-4000-8000-000000000003'::uuid, 'status_guard_records@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('a8001001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, 'status guard ws', 'status-guard-ws')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('a8003001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'Case types only', false),
  ('a8003002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'Case records only', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a8003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('a8003002-0000-4000-8000-000000000002'::uuid, 'case_records', 'editor');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a8002001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, null),
  ('a8002002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000002-0000-4000-8000-000000000002'::uuid, 'a8003001-0000-4000-8000-000000000001'::uuid),
  ('a8002003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8000003-0000-4000-8000-000000000003'::uuid, 'a8003002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('a8004001-0000-4000-8000-000000000001'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'status guard case type a', true, 'a8005001-0000-4000-8000-000000000001'::uuid),
  ('a8004002-0000-4000-8000-000000000002'::uuid, 'a8000001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'status guard case type b', true, 'a8005003-0000-4000-8000-000000000003'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('a8005001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('a8005002-0000-4000-8000-000000000002'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'Closed', '#fa5252', 1),
  ('a8005003-0000-4000-8000-000000000003'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8004002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

-- Inserted without a status, the way Sync inserts records.
insert into public.individuals (id, workspace_id, concept_id, external_id, name)
values ('a8006001-0000-4000-8000-000000000001'::uuid, 'a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'ext-1', 'Record one');

select plan (9);

-- 1.
select is (
  (select status_id from public.individuals where id = 'a8006001-0000-4000-8000-000000000001'::uuid),
  'a8005001-0000-4000-8000-000000000001'::uuid,
  'a record inserted without a status starts in its case type''s default'
);

-- 2.
select throws_ok (
  $t2$
  insert into public.individuals (workspace_id, concept_id, external_id, name, status_id)
  values ('a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'ext-2', 'Record two', 'a8005003-0000-4000-8000-000000000003'::uuid);
  $t2$,
  '23503',
  null,
  'a record cannot hold another case type''s status'
);

-- 3.
select throws_ok (
  $t3$
  delete from public.concept_statuses
  where id = 'a8005001-0000-4000-8000-000000000001'::uuid;
  $t3$,
  '23503',
  null,
  'a status that records use cannot be deleted'
);

-- 4.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a8000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.individuals (workspace_id, concept_id, external_id, name, missing_from_source_at)
  values ('a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'ext-3', 'Record three', null);
  reset role;
  do $chk$
  begin
    if (
      select status_id from public.individuals
      where concept_id = 'a8004001-0000-4000-8000-000000000001'::uuid and external_id = 'ext-3'
    ) is distinct from 'a8005001-0000-4000-8000-000000000001'::uuid then
      raise exception 'a synced record did not start in the default status';
    end if;
  end $chk$;
  $t4$,
  'a Case Types editor syncs in a record, which starts in the default status'
);

reset role;

-- 5.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a8000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set name = 'Record one renamed'
  where id = 'a8006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select name from public.individuals
      where id = 'a8006001-0000-4000-8000-000000000001'::uuid
    ) <> 'Record one renamed' then
      raise exception 'the sync rename did not reach the row';
    end if;
  end $chk$;
  $t5$,
  'a Case Types editor renames a record during sync'
);

reset role;

-- 6.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a8000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set status_id = 'a8005002-0000-4000-8000-000000000002'::uuid
  where id = 'a8006001-0000-4000-8000-000000000001'::uuid;
  $t6$,
  '42501',
  null,
  'a Case Types editor without Case Records editor cannot change a record''s status'
);

-- 7.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a8000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.individuals (workspace_id, concept_id, external_id, name, status_id)
  values ('a8001001-0000-4000-8000-000000000001'::uuid, 'a8004001-0000-4000-8000-000000000001'::uuid, 'ext-4', 'Record four', 'a8005002-0000-4000-8000-000000000002'::uuid);
  $t7$,
  '42501',
  null,
  'a Case Types editor without Case Records editor cannot insert a record in a non-default status'
);

-- 8.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a8000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set status_id = 'a8005002-0000-4000-8000-000000000002'::uuid
  where id = 'a8006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select status_id from public.individuals
      where id = 'a8006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a8005002-0000-4000-8000-000000000002'::uuid then
      raise exception 'the Case Records editor''s status change did not land';
    end if;
  end $chk$;
  $t8$,
  'a Case Records editor changes a record''s status'
);

reset role;

-- 9. `service_role` is trusted, like every backend writer.
select lives_ok (
  $t9$
  set local role service_role;
  update public.individuals
  set status_id = 'a8005001-0000-4000-8000-000000000001'::uuid
  where id = 'a8006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select status_id from public.individuals
      where id = 'a8006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a8005001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the service role''s status change did not land';
    end if;
  end $chk$;
  $t9$,
  'the service role changes a record''s status'
);

reset role;

select * from finish ();

rollback;
