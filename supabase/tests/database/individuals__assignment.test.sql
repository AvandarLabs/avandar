\set ON_ERROR_STOP on

/**
 * Assigning a record. A Case Records editor may set assigned_to to a member
 * of the record's workspace, or clear it. A Case Types editor may insert and
 * rename a record and may not assign it. Anyone outside the workspace is
 * not an assignee. service_role is trusted, as it is for status.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a9000001-0000-4000-8000-000000000001'::uuid, 'assign_owner@test.dev', 'authenticated', 'authenticated'),
  ('a9000002-0000-4000-8000-000000000002'::uuid, 'assign_types@test.dev', 'authenticated', 'authenticated'),
  ('a9000003-0000-4000-8000-000000000003'::uuid, 'assign_records@test.dev', 'authenticated', 'authenticated'),
  ('a9000004-0000-4000-8000-000000000004'::uuid, 'assign_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'assignment ws',
  'assignment-ws'
)
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Case types only', false),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Case records only', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'case_records', 'editor');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a9002001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, null),
  ('a9002002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid),
  ('a9002003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, 'a9003002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values (
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'a9000001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'assignment case type',
  true,
  'a9005001-0000-4000-8000-000000000001'::uuid
);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values (
  'a9005001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'Active',
  '#40c057',
  0
);

insert into public.individuals (id, workspace_id, concept_id, external_id, name)
values (
  'a9006001-0000-4000-8000-000000000001'::uuid,
  'a9001001-0000-4000-8000-000000000001'::uuid,
  'a9004001-0000-4000-8000-000000000001'::uuid,
  'ext-1',
  'Record one'
);

select plan (8);

-- 1.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.individuals (workspace_id, concept_id, external_id, name)
  values (
    'a9001001-0000-4000-8000-000000000001'::uuid,
    'a9004001-0000-4000-8000-000000000001'::uuid,
    'ext-2',
    'Record two'
  );
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where concept_id = 'a9004001-0000-4000-8000-000000000001'::uuid
        and external_id = 'ext-2'
    ) is not null then
      raise exception 'a synced record was inserted with an assignee';
    end if;
  end $chk$;
  $t1$,
  'a Case Types editor syncs in a record with no assignee'
);

reset role;

-- 2.
select throws_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  $t2$,
  '42501',
  'Only Case Records editors can assign a record',
  'a Case Types editor cannot assign a record'
);

reset role;

-- 3.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'the assignee did not land';
    end if;
  end $chk$;
  $t3$,
  'a Case Records editor assigns a record to a workspace member'
);

reset role;

-- 4.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = 'a9000004-0000-4000-8000-000000000004'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  $t4$,
  '23514',
  'A record can only be assigned to a member of its workspace',
  'a record cannot be assigned to someone outside the workspace'
);

reset role;

-- 5.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.individuals
  set name = 'Record one renamed'
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'renaming cleared the assignee';
    end if;
  end $chk$;
  $t5$,
  'renaming a record leaves its assignee in place'
);

reset role;

-- 6.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.individuals
  set assigned_to = null
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is not null then
      raise exception 'the record is still assigned';
    end if;
  end $chk$;
  $t6$,
  'a Case Records editor unassigns a record'
);

reset role;

-- 7.
select lives_ok (
  $t7$
  set local role service_role;
  update public.individuals
  set assigned_to = 'a9000003-0000-4000-8000-000000000003'::uuid
  where id = 'a9006001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select assigned_to from public.individuals
      where id = 'a9006001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'a9000003-0000-4000-8000-000000000003'::uuid then
      raise exception 'the service role''s assignee did not land';
    end if;
  end $chk$;
  $t7$,
  'the service role assigns a record'
);

reset role;

-- 8.
select has_index (
  'public',
  'individuals',
  'idx_individuals__workspace_id_assigned_to',
  'records can be listed by workspace and assignee'
);

select * from finish ();

rollback;
