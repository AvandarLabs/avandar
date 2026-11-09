\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_installations`. Workspace members can read the
 * installs of their workspace. Only settings admins (the owner, or a member
 * whose role group has the settings admin role) can install, update, or
 * uninstall. Other workspaces see nothing. An install cannot move to another
 * workspace, change its plugin id, or be attributed to another installer.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'plugins_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'plugins_member@test.dev', 'authenticated', 'authenticated'),
  ('a7000003-0000-4000-8000-000000000003'::uuid, 'plugins_outsider@test.dev', 'authenticated', 'authenticated'),
  ('a7000004-0000-4000-8000-000000000004'::uuid, 'plugins_admin@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'plugins ws a', 'plugins-ws-a'),
  ('a7001002-0000-4000-8000-000000000002'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, 'plugins ws b', 'plugins-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid),
  ('a7002002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid),
  ('a7002003-0000-4000-8000-000000000003'::uuid, 'a7001002-0000-4000-8000-000000000002'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

-- A non-owner settings admin in both workspaces, through the built-in Global
-- Admin role group each workspace was seeded with.
insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
select
  case rg.workspace_id
    when 'a7001001-0000-4000-8000-000000000001'::uuid then 'a7002004-0000-4000-8000-000000000004'::uuid
    else 'a7002005-0000-4000-8000-000000000005'::uuid
  end,
  rg.workspace_id,
  'a7000004-0000-4000-8000-000000000004'::uuid,
  rg.id
from public.role_groups rg
where
  rg.workspace_id in (
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'a7001002-0000-4000-8000-000000000002'::uuid
  ) and
  rg.is_builtin and
  rg.name = 'Global Admin';

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values (
  'a700a001-0000-4000-8000-000000000001'::uuid,
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'avandar.epidemiology',
  '0.1.0',
  array['data:context']
);

select plan (15);

-- 1. A plain member reads their workspace's install.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations) <> 1 then
      raise exception 'a member cannot read their workspace plugin installs';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace plugin installs'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where workspace_id = 'a7001001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace plugin installs';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no plugin installs'
);

-- 3. A plain member cannot install.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot install a plugin'
);

-- 4. An outsider cannot install into another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t4$,
  '42501',
  null,
  'an outsider cannot install a plugin into another workspace'
);

-- 5. The owner installs.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t5$,
  'the workspace owner installs a plugin'
);

-- 6. A plain member's update is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.plugin_installations set is_enabled = false where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select is_enabled from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) is not true then
      raise exception 'a member disabled a plugin';
    end if;
  end $chk$;
  $t6$,
  'a member without settings admin cannot disable a plugin'
);

-- 7. A plain member's delete is filtered by RLS.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member uninstalled a plugin';
    end if;
  end $chk$;
  $t7$,
  'a member without settings admin cannot uninstall a plugin'
);

-- 8. The owner disables.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_installations set is_enabled = false where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select is_enabled from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) is not false then
      raise exception 'the owner could not disable a plugin';
    end if;
  end $chk$;
  $t8$,
  'the workspace owner disables a plugin'
);

-- 9. A malformed plugin id violates the check constraint.
select throws_ok (
  $t9$
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'Not A Plugin Id', '0.1.0');
  $t9$,
  '23514',
  null,
  'plugin_id must look like publisher.name'
);

-- 10. An outsider's update is filtered by RLS.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.plugin_installations set installed_version = '9.9.9' where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select installed_version from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) is distinct from '0.1.0' then
      raise exception 'an outsider updated another workspace plugin install';
    end if;
  end $chk$;
  $t10$,
  'an outsider cannot update another workspace plugin install'
);

-- 11. An outsider's delete is filtered by RLS.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an outsider uninstalled another workspace plugin';
    end if;
  end $chk$;
  $t11$,
  'an outsider cannot uninstall another workspace plugin'
);

-- 12. A non-owner settings admin installs through their role group.
select lives_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.by-admin', '0.1.0');
  reset role;
  do $chk$
  begin
    if (select installed_by from public.plugin_installations where plugin_id = 'avandar.by-admin') is distinct from 'a7000004-0000-4000-8000-000000000004'::uuid then
      raise exception 'the settings admin install was not attributed to the admin';
    end if;
  end $chk$;
  $t12$,
  'a non-owner settings admin installs a plugin through their role group'
);

-- 13. A settings admin of both workspaces cannot move an install between
-- them. RLS alone would allow it, so the trigger is what stops it.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.plugin_installations
  set workspace_id = 'a7001002-0000-4000-8000-000000000002'::uuid
  where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  $t13$,
  '23514',
  null,
  'a settings admin of both workspaces cannot move an install between them'
);

-- 14. An admin cannot attribute an install to another user.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version, installed_by)
  values (
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'avandar.forged',
    '0.1.0',
    'a7000001-0000-4000-8000-000000000001'::uuid
  );
  $t14$,
  '42501',
  null,
  'a settings admin cannot install a plugin as another user'
);

-- 15. An admin cannot change which plugin an install is for.
select throws_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.plugin_installations
  set plugin_id = 'avandar.renamed'
  where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  $t15$,
  '23514',
  null,
  'a settings admin cannot change the plugin id of an install'
);

select * from finish ();

rollback;
