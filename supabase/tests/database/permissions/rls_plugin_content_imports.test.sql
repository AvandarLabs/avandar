\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_content_imports`. Workspace members can read the
 * imports of their workspace. Only settings admins can record or delete an
 * import, and nobody signed in can change one. Other workspaces see nothing.
 * An import names a dataset of its own workspace, once per content item. It
 * survives uninstalling its plugin and is deleted with its dataset.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1600001-0000-4000-8000-000000000001'::uuid, 'content_imports_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1600002-0000-4000-8000-000000000002'::uuid, 'content_imports_member@test.dev', 'authenticated', 'authenticated'),
  ('d1600003-0000-4000-8000-000000000003'::uuid, 'content_imports_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'content imports ws a', 'content-imports-ws-a'),
  ('d1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'content imports ws b', 'content-imports-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1602001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid),
  ('d1602002-0000-4000-8000-000000000002'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600002-0000-4000-8000-000000000002'::uuid),
  ('d1602003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('d1603001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1602001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d1603002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1602003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('d1606001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1603001-0000-4000-8000-000000000001'::uuid,
   'Mozambique provinces', 'csv_file'::public.datasets__source_type),
  ('d1606002-0000-4000-8000-000000000002'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1603001-0000-4000-8000-000000000001'::uuid,
   'Mozambique districts', 'csv_file'::public.datasets__source_type),
  ('d1606003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'd1603002-0000-4000-8000-000000000002'::uuid,
   'ws b dataset', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version)
values (
  'd160a001-0000-4000-8000-000000000001'::uuid,
  'd1601001-0000-4000-8000-000000000001'::uuid,
  'avandar.mozambique',
  '0.1.0'
);

insert into public.plugin_content_imports (id, workspace_id, plugin_id, content_id, dataset_id, imported_by)
values (
  'd160c001-0000-4000-8000-000000000001'::uuid,
  'd1601001-0000-4000-8000-000000000001'::uuid,
  'avandar.mozambique',
  'provinces',
  'd1606001-0000-4000-8000-000000000001'::uuid,
  'd1600001-0000-4000-8000-000000000001'::uuid
);

select plan (15);

-- 1. A plain member reads their workspace's import.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports) <> 1 then
      raise exception 'a member cannot read their workspace content imports';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace content imports'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace content imports';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no content imports'
);

-- 3. A plain member cannot record an import.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot record a content import'
);

-- 4. An outsider cannot record an import in another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t4$,
  '42501',
  null,
  'an outsider cannot record a content import in another workspace'
);

-- 5. A plain member's delete is filtered by RLS.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member deleted a content import';
    end if;
  end $chk$;
  $t5$,
  'a member without settings admin cannot delete a content import'
);

-- 6. An outsider's delete is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an outsider deleted another workspace content import';
    end if;
  end $chk$;
  $t6$,
  'an outsider cannot delete another workspace content import'
);

-- 7. The owner records an import, attributed to themselves.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  reset role;
  do $chk$
  begin
    if (
      select imported_by
      from public.plugin_content_imports
      where
        workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
        content_id = 'districts'
    ) is distinct from 'd1600001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the owner import was not attributed to the owner';
    end if;
  end $chk$;
  $t7$,
  'the workspace owner records a content import'
);

-- 8. A content item is imported at most once per workspace.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'provinces', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '23505',
  null,
  'a workspace cannot record the same content item twice'
);

-- 9. An import cannot name another workspace's dataset.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'borrowed', 'd1606003-0000-4000-8000-000000000003'::uuid);
  $t9$,
  '23503',
  null,
  'a content import cannot name a dataset of another workspace'
);

-- 10. An admin cannot attribute an import to another user.
select throws_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id, imported_by)
  values (
    'd1601001-0000-4000-8000-000000000001'::uuid,
    'avandar.mozambique',
    'forged',
    'd1606002-0000-4000-8000-000000000002'::uuid,
    'd1600002-0000-4000-8000-000000000002'::uuid
  );
  $t10$,
  '42501',
  null,
  'a settings admin cannot record a content import as another user'
);

-- 11. Nobody signed in can change an import, because the role has no
-- UPDATE grant on the table.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_content_imports
  set content_id = 'renamed'
  where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  '42501',
  null,
  'a settings admin cannot change a content import'
);

-- 12. A malformed plugin id violates the check constraint.
select throws_ok (
  $t12$
  reset role;
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'Not A Plugin Id', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '23514',
  null,
  'plugin_id must look like publisher.name'
);

-- 13. Uninstalling the plugin keeps what it imported.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'd160a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where id = 'd160a001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'the owner could not uninstall the plugin';
    end if;
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'uninstalling deleted a content import';
    end if;
  end $chk$;
  $t13$,
  'a content import survives uninstalling its plugin'
);

-- 14. Deleting the dataset deletes its import, so the item can be imported
-- again.
select lives_ok (
  $t14$
  reset role;
  delete from public.datasets where id = 'd1606001-0000-4000-8000-000000000001'::uuid;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'deleting the dataset left its content import behind';
    end if;
  end $chk$;
  $t14$,
  'deleting the imported dataset deletes its content import'
);

-- 15. The owner deletes an import.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_content_imports
  where
    workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
    content_id = 'districts';
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_content_imports
      where
        workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
        content_id = 'districts'
    ) <> 0 then
      raise exception 'the owner could not delete a content import';
    end if;
  end $chk$;
  $t15$,
  'the workspace owner deletes a content import'
);

select * from finish ();

rollback;
