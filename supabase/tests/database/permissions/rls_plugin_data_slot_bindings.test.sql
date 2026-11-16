\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_data_slot_bindings`. Workspace members can read
 * the bindings of their workspace. Only settings admins can bind, change, or
 * unbind a slot. Other workspaces see nothing. A binding stays inside its
 * install's workspace: it cannot move to another workspace, attach to
 * another workspace's install, or read another workspace's case type or
 * dataset. The binder is always the signed-in user. Deleting the case type
 * keeps the binding with a null source, and uninstalling deletes it.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1500001-0000-4000-8000-000000000001'::uuid, 'slot_bindings_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1500002-0000-4000-8000-000000000002'::uuid, 'slot_bindings_member@test.dev', 'authenticated', 'authenticated'),
  ('d1500003-0000-4000-8000-000000000003'::uuid, 'slot_bindings_outsider@test.dev', 'authenticated', 'authenticated'),
  ('d1500004-0000-4000-8000-000000000004'::uuid, 'slot_bindings_admin@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'slot bindings ws a', 'slot-bindings-ws-a'),
  ('d1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'slot bindings ws b', 'slot-bindings-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1502001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid),
  ('d1502002-0000-4000-8000-000000000002'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500002-0000-4000-8000-000000000002'::uuid),
  ('d1502003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

-- A non-owner settings admin in both workspaces, through the built-in Global
-- Admin role group each workspace was seeded with.
insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
select
  case rg.workspace_id
    when 'd1501001-0000-4000-8000-000000000001'::uuid then 'd1502004-0000-4000-8000-000000000004'::uuid
    else 'd1502005-0000-4000-8000-000000000005'::uuid
  end,
  rg.workspace_id,
  'd1500004-0000-4000-8000-000000000004'::uuid,
  rg.id
from public.role_groups rg
where
  rg.workspace_id in (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd1501002-0000-4000-8000-000000000002'::uuid
  ) and
  rg.is_builtin and
  rg.name = 'Global Admin';

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('d1503001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1502001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d1503002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1502003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1504001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'slot bindings cases a', true, 'd1505001-0000-4000-8000-000000000001'::uuid),
  ('d1504002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'slot bindings cases b', true, 'd1505002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1505001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1504001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1505002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1504002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('d1506001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1503001-0000-4000-8000-000000000001'::uuid,
   'slot bindings dataset a', 'csv_file'::public.datasets__source_type),
  ('d1506002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1503002-0000-4000-8000-000000000002'::uuid,
   'slot bindings dataset b', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values
  ('d150a001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'avandar.epidemiology', '0.2.0', array['data:slots']),
  ('d150a002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'avandar.epidemiology', '0.2.0', array['data:slots']);

insert into public.plugin_data_slot_bindings (id, workspace_id, installation_id, slot_id, source_type, concept_id, attribute_map)
values (
  'd150b001-0000-4000-8000-000000000001'::uuid,
  'd1501001-0000-4000-8000-000000000001'::uuid,
  'd150a001-0000-4000-8000-000000000001'::uuid,
  'cases',
  'concept',
  'd1504001-0000-4000-8000-000000000001'::uuid,
  '{"onsetDate": "d1507001-0000-4000-8000-000000000001"}'::jsonb
);

select plan (20);

-- 1. A plain member reads their workspace's binding.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings) <> 1 then
      raise exception 'a member cannot read their workspace data slot bindings';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace data slot bindings'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where workspace_id = 'd1501001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace data slot bindings';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no data slot bindings'
);

-- 3. A plain member cannot bind a slot.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot bind a data slot'
);

-- 4. An outsider cannot bind a slot in another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  $t4$,
  '42501',
  null,
  'an outsider cannot bind a data slot in another workspace'
);

-- 5. A plain member's update is filtered by RLS.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if not (select attribute_map ? 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) then
      raise exception 'a member changed a data slot binding';
    end if;
  end $chk$;
  $t5$,
  'a member without settings admin cannot change a data slot binding'
);

-- 6. A plain member's delete is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member unbound a data slot';
    end if;
  end $chk$;
  $t6$,
  'a member without settings admin cannot unbind a data slot'
);

-- 7. An outsider's update is filtered by RLS.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if not (select attribute_map ? 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) then
      raise exception 'an outsider changed another workspace data slot binding';
    end if;
  end $chk$;
  $t7$,
  'an outsider cannot change another workspace data slot binding'
);

-- 8. An outsider's delete is filtered by RLS.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an outsider unbound another workspace data slot';
    end if;
  end $chk$;
  $t8$,
  'an outsider cannot unbind another workspace data slot'
);

-- 9. The owner binds a slot to a dataset, attributed to themselves.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  reset role;
  do $chk$
  begin
    if (
      select bound_by
      from public.plugin_data_slot_bindings
      where
        installation_id = 'd150a001-0000-4000-8000-000000000001'::uuid and
        slot_id = 'deaths'
    ) is distinct from 'd1500001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the owner binding was not attributed to the owner';
    end if;
  end $chk$;
  $t9$,
  'the workspace owner binds a data slot to a dataset'
);

-- 10. The owner changes a binding's attribute map.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{"onsetDate": "d1507002-0000-4000-8000-000000000002"}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select attribute_map ->> 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) is distinct from 'd1507002-0000-4000-8000-000000000002' then
      raise exception 'the owner could not change a data slot binding';
    end if;
  end $chk$;
  $t10$,
  'the workspace owner changes a data slot binding'
);

-- 11. A settings admin of both workspaces cannot move a binding between
-- them. RLS alone would allow it, so the trigger is what stops it.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings
  set workspace_id = 'd1501002-0000-4000-8000-000000000002'::uuid
  where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  '23514',
  null,
  'a settings admin of both workspaces cannot move a binding between them'
);

-- 12. A binding cannot read another workspace's case type.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'otherCases', 'concept', 'd1504002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '23514',
  null,
  'a data slot binding cannot read a case type of another workspace'
);

-- 13. A binding cannot read another workspace's dataset.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'otherDeaths', 'dataset', 'd1506002-0000-4000-8000-000000000002'::uuid);
  $t13$,
  '23514',
  null,
  'a data slot binding cannot read a dataset of another workspace'
);

-- 14. A binding cannot attach to another workspace's install.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a002-0000-4000-8000-000000000002'::uuid, 'cases', 'concept', 'd1504001-0000-4000-8000-000000000001'::uuid);
  $t14$,
  '23514',
  null,
  'a data slot binding cannot belong to an install of another workspace'
);

-- 15. A binding names only the source its type says.
select throws_ok (
  $t15$
  reset role;
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id, dataset_id)
  values (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd150a001-0000-4000-8000-000000000001'::uuid,
    'mixed',
    'concept',
    'd1504001-0000-4000-8000-000000000001'::uuid,
    'd1506001-0000-4000-8000-000000000001'::uuid
  );
  $t15$,
  '23514',
  null,
  'a case type binding cannot also name a dataset'
);

-- 16. A binding always takes the signed-in user as its binder. An admin who
-- names another user still ends up as `bound_by`, so nobody can attribute a
-- binding to someone else.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id, bound_by)
  values (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd150a001-0000-4000-8000-000000000001'::uuid,
    'forged',
    'concept',
    'd1504001-0000-4000-8000-000000000001'::uuid,
    'd1500001-0000-4000-8000-000000000001'::uuid
  );
  reset role;
  do $chk$
  begin
    if (
      select bound_by
      from public.plugin_data_slot_bindings
      where
        installation_id = 'd150a001-0000-4000-8000-000000000001'::uuid and
        slot_id = 'forged'
    ) is distinct from 'd1500004-0000-4000-8000-000000000004'::uuid then
      raise exception 'an admin naming another binder was not stamped as the binder';
    end if;
  end $chk$;
  $t16$,
  'an insert stamps the signed-in admin as the binder, whoever it names'
);

-- 17. Changing what a binding reads re-stamps its binder, even when the
-- update names another user.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings
  set
    attribute_map = '{"onsetDate": "d1507003-0000-4000-8000-000000000003"}'::jsonb,
    bound_by = 'd1500001-0000-4000-8000-000000000001'::uuid
  where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select bound_by
      from public.plugin_data_slot_bindings
      where id = 'd150b001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'd1500004-0000-4000-8000-000000000004'::uuid then
      raise exception 'changing the attribute map did not stamp the admin as the binder';
    end if;
  end $chk$;
  $t17$,
  'an update that changes the attribute map stamps the signed-in admin'
);

-- 18. An update that changes nothing material leaves the binder alone, even
-- when another admin runs it and names a different binder.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings
  set
    attribute_map = attribute_map,
    bound_by = 'd1500001-0000-4000-8000-000000000001'::uuid
  where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select bound_by
      from public.plugin_data_slot_bindings
      where id = 'd150b001-0000-4000-8000-000000000001'::uuid
    ) is distinct from 'd1500004-0000-4000-8000-000000000004'::uuid then
      raise exception 'an update that changed nothing material changed the binder';
    end if;
  end $chk$;
  $t18$,
  'an update that changes nothing material keeps the existing binder'
);

-- 19. Deleting the bound case type keeps the binding, with no source.
select lives_ok (
  $t19$
  reset role;
  delete from public.concepts where id = 'd1504001-0000-4000-8000-000000000001'::uuid;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings
      where
        id = 'd150b001-0000-4000-8000-000000000001'::uuid and
        concept_id is null
    ) <> 1 then
      raise exception 'deleting the case type did not leave the binding with a null concept_id';
    end if;
  end $chk$;
  $t19$,
  'deleting the bound case type keeps the binding with a null concept_id'
);

-- 20. Uninstalling deletes the install's bindings.
select lives_ok (
  $t20$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'd150a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where installation_id = 'd150a001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'uninstalling left data slot bindings behind';
    end if;
  end $chk$;
  $t20$,
  'uninstalling a plugin deletes its data slot bindings'
);

select * from finish ();

rollback;
