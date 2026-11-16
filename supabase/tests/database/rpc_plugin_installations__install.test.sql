\set ON_ERROR_STOP on

/**
 * `rpc_plugin_installations__install` writes a plugin install and its data
 * slot bindings in one transaction. A settings admin installs with bindings
 * that take the new install's id and workspace. A binding that fails rolls
 * the install back with it. Anyone who is not a settings admin of the
 * workspace cannot install.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1700001-0000-4000-8000-000000000001'::uuid, 'install_rpc_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1700002-0000-4000-8000-000000000002'::uuid, 'install_rpc_member@test.dev', 'authenticated', 'authenticated'),
  ('d1700003-0000-4000-8000-000000000003'::uuid, 'install_rpc_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1701001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid, 'install rpc ws a', 'install-rpc-ws-a'),
  ('d1701002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid, 'install rpc ws b', 'install-rpc-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1702001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid),
  ('d1702002-0000-4000-8000-000000000002'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1700002-0000-4000-8000-000000000002'::uuid),
  ('d1702003-0000-4000-8000-000000000003'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1704001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'install rpc cases a', true, 'd1705001-0000-4000-8000-000000000001'::uuid),
  ('d1704002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'install rpc cases b', true, 'd1705002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1705001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1704001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1705002-0000-4000-8000-000000000002'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'd1704002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

select plan (6);

-- 1. The owner installs with a case type binding. The binding takes the new
-- install's id and workspace, and both rows are attributed to the owner.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_installation public.plugin_installations;
  begin
    v_installation := public.rpc_plugin_installations__install(
      'd1701001-0000-4000-8000-000000000001'::uuid,
      'avandar.epidemiology',
      '0.2.0',
      array['data:context', 'data:slots'],
      '[{"slot_id": "cases", "source_type": "concept", "concept_id": "d1704001-0000-4000-8000-000000000001", "dataset_id": null, "attribute_map": {"onsetDate": "d1706001-0000-4000-8000-000000000001"}}]'::jsonb
    );
    if v_installation.installed_by is distinct from 'd1700001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the install was not attributed to the owner';
    end if;
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = v_installation.id and
        binding.workspace_id = 'd1701001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.concept_id = 'd1704001-0000-4000-8000-000000000001'::uuid and
        binding.attribute_map ->> 'onsetDate' = 'd1706001-0000-4000-8000-000000000001' and
        binding.bound_by = 'd1700001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'the install did not write its case type binding';
    end if;
  end $chk$;
  $t1$,
  'a settings admin installs a plugin with its data slot bindings'
);

-- 2. A binding that reads another workspace's case type fails the call.
select throws_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.other',
    '0.1.0',
    array['data:slots'],
    '[{"slot_id": "cases", "source_type": "concept", "concept_id": "d1704002-0000-4000-8000-000000000002", "dataset_id": null, "attribute_map": {}}]'::jsonb
  );
  $t2$,
  '23514',
  null,
  'an install whose binding reads another workspace case type fails'
);

reset role;

-- 3. That failure left no install behind.
select is (
  (
    select count(*)::int
    from public.plugin_installations
    where
      workspace_id = 'd1701001-0000-4000-8000-000000000001'::uuid and
      plugin_id = 'avandar.other'
  ),
  0,
  'a failing binding rolls back its install'
);

-- 4. An install with no bindings writes only the install.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_installation public.plugin_installations;
  begin
    v_installation := public.rpc_plugin_installations__install(
      'd1701001-0000-4000-8000-000000000001'::uuid,
      'avandar.mozambique',
      '0.1.0',
      array[]::text[],
      '[]'::jsonb
    );
    if (select count(*)::int from public.plugin_data_slot_bindings where installation_id = v_installation.id) <> 0 then
      raise exception 'an install without bindings wrote a binding';
    end if;
  end $chk$;
  $t4$,
  'an install with no bindings writes no data slot bindings'
);

-- 5. A plain member cannot install.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.by-member',
    '0.1.0',
    array[]::text[],
    '[]'::jsonb
  );
  $t5$,
  '42501',
  null,
  'a member without settings admin cannot install through the rpc'
);

-- 6. An outsider cannot install into another workspace.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.by-outsider',
    '0.1.0',
    array[]::text[],
    '[]'::jsonb
  );
  $t6$,
  '42501',
  null,
  'an outsider cannot install into another workspace through the rpc'
);

select * from finish ();

rollback;
