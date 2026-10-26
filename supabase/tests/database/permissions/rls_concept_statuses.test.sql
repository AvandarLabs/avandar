\set ON_ERROR_STOP on

/**
 * RLS for `concept_statuses`. Any workspace member reads a case type's
 * statuses. Only a Case Types editor writes them, only inside their own
 * workspace, and only for a case type of that same workspace. `anon` cannot
 * reach the table.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'statuses_rls_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'statuses_rls_editor@test.dev', 'authenticated', 'authenticated'),
  ('a7000003-0000-4000-8000-000000000003'::uuid, 'statuses_rls_viewer@test.dev', 'authenticated', 'authenticated'),
  ('a7000004-0000-4000-8000-000000000004'::uuid, 'statuses_rls_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'statuses rls ws a', 'statuses-rls-ws-a'),
  ('a7001002-0000-4000-8000-000000000002'::uuid, 'a7000004-0000-4000-8000-000000000004'::uuid, 'statuses rls ws b', 'statuses-rls-ws-b')
on conflict (id) do nothing;

-- Custom role groups, so the editor and the viewer each hold exactly one
-- Case Types role and nothing from the built-in groups.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('a7003001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'Status editors', false),
  ('a7003002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'Status viewers', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a7003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('a7003002-0000-4000-8000-000000000002'::uuid, 'case_types', 'viewer');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, null),
  ('a7002002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid, 'a7003001-0000-4000-8000-000000000001'::uuid),
  ('a7002003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, 'a7003002-0000-4000-8000-000000000002'::uuid),
  ('a7002004-0000-4000-8000-000000000004'::uuid, 'a7001002-0000-4000-8000-000000000002'::uuid, 'a7000004-0000-4000-8000-000000000004'::uuid, null)
on conflict (id) do nothing;

-- Case type statuses. Keep this block in one place: every concept insert in
-- these tests names its default status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('a7004001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'statuses rls case type a', true, 'a7005001-0000-4000-8000-000000000001'::uuid),
  ('a7004002-0000-4000-8000-000000000002'::uuid, 'a7000004-0000-4000-8000-000000000004'::uuid, 'a7001002-0000-4000-8000-000000000002'::uuid, 'statuses rls case type b', true, 'a7005002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('a7005001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7004001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('a7005002-0000-4000-8000-000000000002'::uuid, 'a7001002-0000-4000-8000-000000000002'::uuid, 'a7004002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0),
  ('a7005003-0000-4000-8000-000000000003'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7004001-0000-4000-8000-000000000001'::uuid, 'Inactive', '#637c95', 1);

select plan (12);

-- 1.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_statuses s
      where s.concept_id = 'a7004001-0000-4000-8000-000000000001'::uuid
    ) <> 2 then
      raise exception 'a viewer cannot read their case type''s statuses';
    end if;
  end $chk$;
  $t1$,
  'a Case Types viewer reads their case type''s statuses'
);

reset role;

-- 2. The cross-tenant boundary.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  do $chk$
  begin
    if (
      select count(*)::int from public.concept_statuses s
      where s.workspace_id = 'a7001001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read another workspace''s statuses';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no statuses'
);

reset role;

-- 3.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7004001-0000-4000-8000-000000000001'::uuid, 'Viewer status', '#228be6', 2);
  $t3$,
  '42501',
  null,
  'a Case Types viewer cannot add a status'
);

-- 4.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
  values ('a7005004-0000-4000-8000-000000000004'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7004001-0000-4000-8000-000000000001'::uuid, 'Escalated', '#fd7e14', 2);
  reset role;
  do $chk$
  begin
    if not exists (
      select 1 from public.concept_statuses
      where id = 'a7005004-0000-4000-8000-000000000004'::uuid
    ) then
      raise exception 'the editor''s status was not inserted';
    end if;
  end $chk$;
  $t4$,
  'a Case Types editor adds a status'
);

reset role;

-- 5. UPDATE has a `using`, so an editor's update reaches the row.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.concept_statuses
  set name = 'Dormant'
  where id = 'a7005003-0000-4000-8000-000000000003'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select name from public.concept_statuses
      where id = 'a7005003-0000-4000-8000-000000000003'::uuid
    ) <> 'Dormant' then
      raise exception 'the editor''s rename did not reach the row';
    end if;
  end $chk$;
  $t5$,
  'a Case Types editor renames a status'
);

reset role;

-- 6. `with check` on UPDATE.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.concept_statuses
  set workspace_id = 'a7001002-0000-4000-8000-000000000002'::uuid
  where id = 'a7005003-0000-4000-8000-000000000003'::uuid;
  $t6$,
  '42501',
  null,
  'a Case Types editor cannot move a status into another workspace'
);

-- 7.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.concept_statuses
  set name = 'Viewer rename'
  where id = 'a7005001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select name from public.concept_statuses
      where id = 'a7005001-0000-4000-8000-000000000001'::uuid
    ) <> 'Active' then
      raise exception 'a viewer renamed a status';
    end if;
  end $chk$;
  $t7$,
  'a Case Types viewer cannot rename a status'
);

reset role;

-- 8.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7004001-0000-4000-8000-000000000001'::uuid, 'Smuggled', '#fa5252', 3);
  $t8$,
  '42501',
  null,
  'an outsider cannot add a status to another workspace'
);

-- 9. The status's workspace has to be its case type's workspace.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.concept_statuses (workspace_id, concept_id, name, color, position)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7004002-0000-4000-8000-000000000002'::uuid, 'Cross tenant', '#fa5252', 3);
  $t9$,
  '42501',
  null,
  'an editor cannot attach a status to another workspace''s case type'
);

-- 10.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.concept_statuses
  where id = 'a7005004-0000-4000-8000-000000000004'::uuid;
  reset role;
  do $chk$
  begin
    if not exists (
      select 1 from public.concept_statuses
      where id = 'a7005004-0000-4000-8000-000000000004'::uuid
    ) then
      raise exception 'a viewer deleted a status';
    end if;
  end $chk$;
  $t10$,
  'a Case Types viewer cannot delete a status'
);

reset role;

-- 11.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.concept_statuses
  where id = 'a7005004-0000-4000-8000-000000000004'::uuid;
  reset role;
  do $chk$
  begin
    if exists (
      select 1 from public.concept_statuses
      where id = 'a7005004-0000-4000-8000-000000000004'::uuid
    ) then
      raise exception 'the editor''s delete did not reach the row';
    end if;
  end $chk$;
  $t11$,
  'a Case Types editor deletes an unused status'
);

reset role;

-- 12.
select throws_ok (
  $t12$
  set local role anon;
  select count(*)::int from public.concept_statuses;
  $t12$,
  '42501',
  null,
  'anon cannot select concept_statuses'
);

select * from finish ();

rollback;
