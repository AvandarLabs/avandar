\set ON_ERROR_STOP on

/**
 * `rpc_plugin_data_slot_bindings__save` binds one data slot of an install,
 * replacing the slot's binding when it has one. A settings admin binds and
 * rebinds a slot, and it keeps one row. Nobody else can bind, and a binding
 * still cannot read another workspace's case type. A save must name the
 * source its type says, whether it adds a binding or replaces one.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1800001-0000-4000-8000-000000000001'::uuid, 'save_binding_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1800002-0000-4000-8000-000000000002'::uuid, 'save_binding_member@test.dev', 'authenticated', 'authenticated'),
  ('d1800003-0000-4000-8000-000000000003'::uuid, 'save_binding_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1801001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid, 'save binding ws a', 'save-binding-ws-a'),
  ('d1801002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid, 'save binding ws b', 'save-binding-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1802001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid),
  ('d1802002-0000-4000-8000-000000000002'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1800002-0000-4000-8000-000000000002'::uuid),
  ('d1802003-0000-4000-8000-000000000003'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values (
  'd1803001-0000-4000-8000-000000000001'::uuid,
  'd1800001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'd1802001-0000-4000-8000-000000000001'::uuid,
  'Owner',
  'Owner'
)
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1804001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'save binding cases a', true, 'd1805001-0000-4000-8000-000000000001'::uuid),
  ('d1804002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'save binding cases b', true, 'd1805002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1805001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1804001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1805002-0000-4000-8000-000000000002'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'd1804002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values (
  'd1806001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'd1800001-0000-4000-8000-000000000001'::uuid,
  'd1803001-0000-4000-8000-000000000001'::uuid,
  'save binding line list',
  'csv_file'::public.datasets__source_type
)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values (
  'd180a001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'avandar.epidemiology',
  '0.2.0',
  array['data:slots']
);

select plan (13);

-- 1. The owner binds a slot that had no binding.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_binding public.plugin_data_slot_bindings;
  begin
    v_binding := public.rpc_plugin_data_slot_bindings__save(
      'd180a001-0000-4000-8000-000000000001'::uuid,
      'cases',
      'concept',
      'd1804001-0000-4000-8000-000000000001'::uuid,
      null,
      '{"onsetDate": "d1807001-0000-4000-8000-000000000001"}'::jsonb
    );
    if v_binding.workspace_id is distinct from 'd1801001-0000-4000-8000-000000000001'::uuid
      or v_binding.bound_by is distinct from 'd1800001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the binding did not take the install workspace and the caller';
    end if;
  end $chk$;
  $t1$,
  'a settings admin binds a data slot through the rpc'
);

-- 2. Saving the slot again replaces its binding instead of adding one.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'cases',
    'dataset',
    null,
    'd1806001-0000-4000-8000-000000000001'::uuid,
    '{"onsetDate": "d1807002-0000-4000-8000-000000000002"}'::jsonb
  );
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases'
    ) <> 1 then
      raise exception 'saving a bound slot again added a second binding';
    end if;
    if not exists (
      select 1
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.source_type = 'dataset' and
        binding.concept_id is null and
        binding.dataset_id = 'd1806001-0000-4000-8000-000000000001'::uuid and
        binding.attribute_map ->> 'onsetDate' = 'd1807002-0000-4000-8000-000000000002'
    ) then
      raise exception 'saving a bound slot again did not replace its source and map';
    end if;
  end $chk$;
  $t2$,
  'saving a bound data slot again replaces its binding'
);

-- 3. A plain member cannot bind a slot.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'dataset',
    null,
    'd1806001-0000-4000-8000-000000000001'::uuid,
    '{}'::jsonb
  );
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot bind a data slot through the rpc'
);

-- 4. An outsider cannot read the install, so cannot bind its slots.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'concept',
    'd1804002-0000-4000-8000-000000000002'::uuid,
    null,
    '{}'::jsonb
  );
  $t4$,
  '42501',
  null,
  'an outsider cannot bind a data slot of another workspace install'
);

-- 5. The rpc cannot bind a slot to another workspace's case type.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'concept',
    'd1804002-0000-4000-8000-000000000002'::uuid,
    null,
    '{}'::jsonb
  );
  $t5$,
  '23514',
  null,
  'a data slot cannot be bound to a case type of another workspace'
);

-- 6. A new case type binding saved with no case type is refused.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'concept',
    null,
    null,
    '{}'::jsonb
  );
  $t6$,
  '23514',
  'A data slot binding must name the case type its source type says',
  'a new case type binding saved with no case type is refused'
);

-- 7. A new dataset binding saved with no dataset is refused.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'dataset',
    null,
    null,
    '{}'::jsonb
  );
  $t7$,
  '23514',
  'A data slot binding must name the dataset its source type says',
  'a new dataset binding saved with no dataset is refused'
);

-- 8. A save with no source for a slot that already has a binding is refused.
-- The check on the proposed insert fires before the conflict is found, so the
-- existing binding is never reached and stays as it was.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'cases',
    'concept',
    null,
    null,
    '{}'::jsonb
  );
  $t8$,
  '23514',
  'A data slot binding must name the case type its source type says',
  'a save with no case type for an already bound slot is refused before it replaces the binding'
);

-- 9. Switching a bound slot back to a case type works when it names one. The
-- slot already has a binding, so this takes the replace branch of the upsert.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'cases',
    'concept',
    'd1804001-0000-4000-8000-000000000001'::uuid,
    null,
    '{}'::jsonb
  );
  reset role;
  do $chk$
  begin
    if not exists (
      select 1
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.source_type = 'concept' and
        binding.concept_id = 'd1804001-0000-4000-8000-000000000001'::uuid and
        binding.dataset_id is null
    ) then
      raise exception 'switching the slot back to a case type did not take it';
    end if;
  end $chk$;
  $t9$,
  'switching a bound slot to a case type works when it names the case type'
);

-- 10. A conflicting save that keeps the source and changes only the field
-- mapping takes the replace branch too, and still leaves one binding.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'cases',
    'concept',
    'd1804001-0000-4000-8000-000000000001'::uuid,
    null,
    '{"onsetDate": "d1807003-0000-4000-8000-000000000003"}'::jsonb
  );
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.concept_id = 'd1804001-0000-4000-8000-000000000001'::uuid and
        binding.attribute_map ->> 'onsetDate' = 'd1807003-0000-4000-8000-000000000003'
    ) <> 1 then
      raise exception 'a conflicting save with the same source did not replace the field mapping';
    end if;
  end $chk$;
  $t10$,
  'saving a bound slot with the same source replaces only its field mapping'
);

reset role;

-- Function privileges: `authenticated` only, the one role that calls it.
select ok (
  has_function_privilege('authenticated', 'public.rpc_plugin_data_slot_bindings__save(uuid, text, public.plugin_data_slot_bindings__source_type, uuid, uuid, jsonb)', 'execute'),
  'a signed-in user may call the save rpc'
);

select ok (
  not has_function_privilege('anon', 'public.rpc_plugin_data_slot_bindings__save(uuid, text, public.plugin_data_slot_bindings__source_type, uuid, uuid, jsonb)', 'execute'),
  'an anonymous visitor may not call the save rpc'
);

select ok (
  not has_function_privilege('service_role', 'public.rpc_plugin_data_slot_bindings__save(uuid, text, public.plugin_data_slot_bindings__source_type, uuid, uuid, jsonb)', 'execute'),
  'the service role may not call the save rpc'
);

select * from finish ();

rollback;
