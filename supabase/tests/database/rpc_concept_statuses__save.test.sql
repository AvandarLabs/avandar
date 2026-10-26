\set ON_ERROR_STOP on

/**
 * `rpc_concept_statuses__save` replaces a case type's statuses in one
 * transaction. Refusals raise a stable `hint` and change nothing. A Case
 * Types editor who holds no Case Records role can still move records off a
 * removed status, because the function checks roles itself.
 */
begin;

set search_path to extensions, public;

create function pg_temp.error_hint (p_sql text) returns text language plpgsql as $$
declare
  v_hint text;
begin
  execute p_sql;
  return 'no error';
exception
  when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return v_hint;
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('a9000001-0000-4000-8000-000000000001'::uuid, 'save_rpc_owner@test.dev', 'authenticated', 'authenticated'),
  ('a9000002-0000-4000-8000-000000000002'::uuid, 'save_rpc_editor@test.dev', 'authenticated', 'authenticated'),
  ('a9000003-0000-4000-8000-000000000003'::uuid, 'save_rpc_viewer@test.dev', 'authenticated', 'authenticated'),
  ('a9000004-0000-4000-8000-000000000004'::uuid, 'save_rpc_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'save rpc ws a', 'save-rpc-ws-a'),
  ('a9001002-0000-4000-8000-000000000002'::uuid, 'a9000004-0000-4000-8000-000000000004'::uuid, 'save rpc ws b', 'save-rpc-ws-b')
on conflict (id) do nothing;

-- The editor holds Case Types editor and no Case Records role at all.
insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Status set editors', false),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'Status set viewers', false);

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('a9003001-0000-4000-8000-000000000001'::uuid, 'case_types', 'editor'),
  ('a9003002-0000-4000-8000-000000000002'::uuid, 'case_types', 'viewer');

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('a9002001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, null),
  ('a9002002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000002-0000-4000-8000-000000000002'::uuid, 'a9003001-0000-4000-8000-000000000001'::uuid),
  ('a9002003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9000003-0000-4000-8000-000000000003'::uuid, 'a9003002-0000-4000-8000-000000000002'::uuid),
  ('a9002004-0000-4000-8000-000000000004'::uuid, 'a9001002-0000-4000-8000-000000000002'::uuid, 'a9000004-0000-4000-8000-000000000004'::uuid, null)
on conflict (id) do nothing;

insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('a9004001-0000-4000-8000-000000000001'::uuid, 'a9000001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'save rpc case type', true, 'a9005001-0000-4000-8000-000000000001'::uuid),
  ('a9004002-0000-4000-8000-000000000002'::uuid, 'a9000004-0000-4000-8000-000000000004'::uuid, 'a9001002-0000-4000-8000-000000000002'::uuid, 'other workspace case type', true, 'a9005004-0000-4000-8000-000000000004'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, description, color, position)
values
  ('a9005001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9004001-0000-4000-8000-000000000001'::uuid, 'Active', 'Open.', '#40c057', 0),
  ('a9005002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9004001-0000-4000-8000-000000000001'::uuid, 'Inactive', null, '#637c95', 1),
  ('a9005003-0000-4000-8000-000000000003'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9004001-0000-4000-8000-000000000001'::uuid, 'Closed', null, '#fa5252', 2),
  ('a9005004-0000-4000-8000-000000000004'::uuid, 'a9001002-0000-4000-8000-000000000002'::uuid, 'a9004002-0000-4000-8000-000000000002'::uuid, 'Active', null, '#40c057', 0);

-- Record one is Active and record two is Closed.
insert into public.individuals (id, workspace_id, concept_id, external_id, name, status_id)
values
  ('a9006001-0000-4000-8000-000000000001'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9004001-0000-4000-8000-000000000001'::uuid, 'ext-1', 'Record one', 'a9005001-0000-4000-8000-000000000001'::uuid),
  ('a9006002-0000-4000-8000-000000000002'::uuid, 'a9001001-0000-4000-8000-000000000001'::uuid, 'a9004001-0000-4000-8000-000000000001'::uuid, 'ext-2', 'Record two', 'a9005003-0000-4000-8000-000000000003'::uuid);

select plan (23);

-- Refusals. None of them changes anything.

-- 1.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":"Open.","color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'case_types_editor_required',
  'a Case Types viewer cannot save statuses'
);

reset role;

-- 2.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":"Open.","color":"#40c057","position":0}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'case_types_editor_required',
  'a user outside the workspace cannot save statuses'
);

reset role;

-- 3.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_set_empty',
  'an empty status set is refused'
);

reset role;

-- 4.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"   ","description":null,"color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_name_required',
  'a blank status name is refused'
);

reset role;

-- 5.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":null,"color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":" active","description":null,"color":"#637c95","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_names_not_unique',
  'two statuses differing only in case and spacing are refused'
);

reset role;

-- 6.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":null,"color":"#ZZZZZZ","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_color_invalid',
  'a color that is not lowercase hex is refused'
);

reset role;

-- 7.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":null,"color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2},{"id":"a9005004-0000-4000-8000-000000000004","name":"Borrowed","description":null,"color":"#228be6","position":3}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_not_in_case_type',
  'a status of another case type is refused'
);

reset role;

-- 8. Active is the default and is not in the set.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":0},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":1}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{"a9005001-0000-4000-8000-000000000001":"a9005002-0000-4000-8000-000000000002"}'::jsonb
    );
  $s$),
  'status_default_not_in_set',
  'removing the default status without choosing a new default is refused'
);

reset role;

-- 9. Record two is Closed.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":null,"color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{}'::jsonb
    );
  $s$),
  'status_replacement_required',
  'removing a status that records use without a replacement is refused'
);

reset role;

-- 10.
select is (
  pg_temp.error_hint ($s$
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
    select public.rpc_concept_statuses__save (
      'a9004001-0000-4000-8000-000000000001'::uuid,
      '[{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":null,"color":"#40c057","position":0},{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":1}]'::jsonb,
      'a9005001-0000-4000-8000-000000000001'::uuid,
      '{"a9005003-0000-4000-8000-000000000003":"a9005003-0000-4000-8000-000000000003"}'::jsonb
    );
  $s$),
  'status_replacement_not_in_set',
  'moving records to a status that is being removed is refused'
);

reset role;

-- 11.
select is (
  (
    select array_agg(name order by position)
    from public.concept_statuses
    where concept_id = 'a9004001-0000-4000-8000-000000000001'::uuid
  ),
  array['Active', 'Inactive', 'Closed'],
  'refused saves change nothing'
);

-- Saves that succeed, in sequence. Each builds on the one before.

-- 12.
select lives_ok (
  $s$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concept_statuses__save (
    'a9004001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Inactive","description":null,"color":"#637c95","position":0},{"id":"a9005001-0000-4000-8000-000000000001","name":"Active","description":"Open.","color":"#40c057","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
    'a9005001-0000-4000-8000-000000000001'::uuid,
    '{}'::jsonb
  );
  $s$,
  'a Case Types editor reorders statuses'
);

reset role;

-- 13.
select is (
  (
    select array_agg(name order by position)
    from public.concept_statuses
    where concept_id = 'a9004001-0000-4000-8000-000000000001'::uuid
  ),
  array['Inactive', 'Active', 'Closed'],
  'a reorder saves the new positions'
);

-- 14. Swapping two names would trip the unique name index without staging.
select lives_ok (
  $s$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concept_statuses__save (
    'a9004001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Active","description":null,"color":"#637c95","position":0},{"id":"a9005001-0000-4000-8000-000000000001","name":"Inactive","description":"Open.","color":"#40c057","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
    'a9005001-0000-4000-8000-000000000001'::uuid,
    '{}'::jsonb
  );
  $s$,
  'a Case Types editor swaps two statuses'' names'
);

reset role;

-- 15.
select is (
  array[
    (select name from public.concept_statuses where id = 'a9005001-0000-4000-8000-000000000001'::uuid),
    (select name from public.concept_statuses where id = 'a9005002-0000-4000-8000-000000000002'::uuid)
  ],
  array['Inactive', 'Active'],
  'a name swap keeps each status''s id'
);

-- 16.
select lives_ok (
  $s$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concept_statuses__save (
    'a9004001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Active","description":null,"color":"#637c95","position":0},{"id":"a9005001-0000-4000-8000-000000000001","name":"Inactive","description":"Open.","color":"#40c057","position":1},{"id":"a9005003-0000-4000-8000-000000000003","name":"Closed","description":null,"color":"#fa5252","position":2}]'::jsonb,
    'a9005002-0000-4000-8000-000000000002'::uuid,
    '{}'::jsonb
  );
  $s$,
  'a Case Types editor changes the default status'
);

reset role;

-- 17.
select is (
  (select default_status_id from public.concepts where id = 'a9004001-0000-4000-8000-000000000001'::uuid),
  'a9005002-0000-4000-8000-000000000002'::uuid,
  'the case type defaults to the newly chosen status'
);

-- 18. The editor holds no Case Records role, and the records still move.
select lives_ok (
  $s$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concept_statuses__save (
    'a9004001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Active","description":null,"color":"#637c95","position":0},{"id":"a9005001-0000-4000-8000-000000000001","name":"Inactive","description":"Open.","color":"#40c057","position":1}]'::jsonb,
    'a9005002-0000-4000-8000-000000000002'::uuid,
    '{"a9005003-0000-4000-8000-000000000003":"a9005001-0000-4000-8000-000000000001"}'::jsonb
  );
  $s$,
  'a Case Types editor removes a status in use by choosing a replacement'
);

reset role;

-- 19.
select is (
  (select status_id from public.individuals where id = 'a9006002-0000-4000-8000-000000000002'::uuid),
  'a9005001-0000-4000-8000-000000000001'::uuid,
  'records on the removed status move to its replacement'
);

-- 20.
select is (
  (select count(*)::int from public.concept_statuses where id = 'a9005003-0000-4000-8000-000000000003'::uuid),
  0,
  'the removed status is deleted'
);

-- 21. A new status takes the name of a status removed in the same save.
select lives_ok (
  $s$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a9000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_concept_statuses__save (
    'a9004001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"a9005002-0000-4000-8000-000000000002","name":"Active","description":null,"color":"#637c95","position":0},{"id":"a9005005-0000-4000-8000-000000000005","name":"Inactive","description":null,"color":"#637c95","position":1}]'::jsonb,
    'a9005002-0000-4000-8000-000000000002'::uuid,
    '{"a9005001-0000-4000-8000-000000000001":"a9005002-0000-4000-8000-000000000002"}'::jsonb
  );
  $s$,
  'a new status reuses the name of a status removed in the same save'
);

reset role;

-- 22.
select is (
  (select name from public.concept_statuses where id = 'a9005005-0000-4000-8000-000000000005'::uuid),
  'Inactive',
  'the new status holds the reused name'
);

-- 23.
select is (
  array[
    (select status_id from public.individuals where id = 'a9006001-0000-4000-8000-000000000001'::uuid),
    (select status_id from public.individuals where id = 'a9006002-0000-4000-8000-000000000002'::uuid)
  ],
  array['a9005002-0000-4000-8000-000000000002'::uuid, 'a9005002-0000-4000-8000-000000000002'::uuid],
  'both records moved to the replacement of the removed status'
);

select * from finish ();

rollback;
