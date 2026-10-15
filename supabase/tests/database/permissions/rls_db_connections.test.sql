\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `db_connections` and `db_connections__postgres`, plus
 * the write-lockdown invariant that replaces per-op RLS policies for insert/
 * update/delete on both tables.
 *
 * Unlike `datasets__pdf_file` (gated by `util__auth_user_can_access_resource`),
 * these two tables are gated by app role on `data_sources`
 * (`util__auth_user_meets_min_app_role`) for reads, since a connection is
 * infrastructure configuration shared workspace-wide, not a per-resource
 * shareable item. A workspace owner always satisfies any minimum app role,
 * so the insider/outsider pair below uses workspace ownership directly, the
 * same shortcut `util__auth_user_meets_min_app_role` itself takes.
 *
 * `authenticated` has no insert/update/delete grant on either table at all:
 * writes only happen through the `external-datasets` edge function's
 * `service_role` client, because `vault_secret_id` is not a foreign key and
 * nothing else stops a direct insert/update from pointing a row at a Vault
 * secret it never created. The insider-write tests below
 * prove this holds even for a legitimate member of the *owning* workspace,
 * not just an outsider - RLS row-filtering alone cannot express this, since
 * the hole it closes is a row that is otherwise perfectly in-workspace.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('0c010001-0000-4000-8000-000000000001'::uuid, 'dbconn_insider@test.dev', 'authenticated', 'authenticated'),
  ('0c010002-0000-4000-8000-000000000002'::uuid, 'dbconn_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('0c011001-0000-4000-8000-000000000001'::uuid, '0c010001-0000-4000-8000-000000000001'::uuid, 'dbconn ws a', 'dbconn-ws-a'),
  ('0c011002-0000-4000-8000-000000000002'::uuid, '0c010002-0000-4000-8000-000000000002'::uuid, 'dbconn ws b', 'dbconn-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('0c012001-0000-4000-8000-000000000001'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c010001-0000-4000-8000-000000000001'::uuid),
  ('0c012002-0000-4000-8000-000000000002'::uuid, '0c011002-0000-4000-8000-000000000002'::uuid, '0c010002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('0c013001-0000-4000-8000-000000000001'::uuid, '0c010001-0000-4000-8000-000000000001'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c012001-0000-4000-8000-000000000001'::uuid, 'Insider', 'Insider'),
  ('0c013002-0000-4000-8000-000000000002'::uuid, '0c010002-0000-4000-8000-000000000002'::uuid, '0c011002-0000-4000-8000-000000000002'::uuid, '0c012002-0000-4000-8000-000000000002'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

insert into public.db_connections (
  id, workspace_id, connection_type, name, created_by
)
values (
  '0c014001-0000-4000-8000-000000000001'::uuid,
  '0c011001-0000-4000-8000-000000000001'::uuid,
  'postgres'::public.db_connections__connection_type,
  'ws a connection',
  '0c010001-0000-4000-8000-000000000001'::uuid
)
on conflict (id) do nothing;

insert into public.db_connections__postgres (
  connection_id, workspace_id, host, port, database_name, username, vault_secret_id
)
values (
  '0c014001-0000-4000-8000-000000000001'::uuid,
  '0c011001-0000-4000-8000-000000000001'::uuid,
  'db.example.org',
  5432,
  'reporting',
  'readonly_user',
  gen_random_uuid()
)
on conflict (connection_id) do nothing;

-- Non-owner members of workspace A (the owning workspace), at distinct
-- `data_sources` app-role levels, to prove the SELECT policy's minimum role
-- is actually enforced (requires `'editor'`, not `'viewer'`) and not just
-- satisfied by every candidate's owner-bypass.
insert into auth.users (id, email, aud, role)
values
  ('0c010003-0000-4000-8000-000000000003'::uuid, 'dbconn_viewer_member@test.dev', 'authenticated', 'authenticated'),
  ('0c010004-0000-4000-8000-000000000004'::uuid, 'dbconn_editor_member@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('0c015001-0000-4000-8000-000000000001'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, 'dbconn viewer-only group', false),
  ('0c015002-0000-4000-8000-000000000002'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, 'dbconn editor group', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('0c015001-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'viewer'::public.role_level),
  ('0c015002-0000-4000-8000-000000000002'::uuid, 'data_sources'::public.app_type, 'editor'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('0c012003-0000-4000-8000-000000000003'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c010003-0000-4000-8000-000000000003'::uuid, '0c015001-0000-4000-8000-000000000001'::uuid),
  ('0c012004-0000-4000-8000-000000000004'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c010004-0000-4000-8000-000000000004'::uuid, '0c015002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('0c013003-0000-4000-8000-000000000003'::uuid, '0c010003-0000-4000-8000-000000000003'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c012003-0000-4000-8000-000000000003'::uuid, 'Viewer Member', 'Viewer Member'),
  ('0c013004-0000-4000-8000-000000000004'::uuid, '0c010004-0000-4000-8000-000000000004'::uuid, '0c011001-0000-4000-8000-000000000001'::uuid, '0c012004-0000-4000-8000-000000000004'::uuid, 'Editor Member', 'Editor Member')
on conflict (id) do nothing;

select plan(22);

-- 1. A member of the owning workspace reads the db_connections row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own db_connections row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the db_connections row'
);

-- 2. A member of another workspace reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.workspace_id = '0c011001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read db_connections rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no db_connections rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.db_connections (workspace_id, connection_type, name, created_by)
  values (
    '0c011001-0000-4000-8000-000000000001'::uuid,
    'postgres'::public.db_connections__connection_type,
    'hostile insert',
    '0c010002-0000-4000-8000-000000000002'::uuid
  );
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a db_connections row into another workspace'
);

-- 4. An outsider's UPDATE is rejected outright - no grant at all, not just RLS.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.db_connections
  set name = 'renamed by outsider'
  where id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t4$,
  '42501',
  null,
  'an outsider cannot update a db_connections row in another workspace'
);

-- 5. An outsider's DELETE is rejected outright - no grant at all, not just RLS.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.db_connections where id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t5$,
  '42501',
  null,
  'an outsider cannot delete a db_connections row in another workspace'
);

-- 4b. An insider (own workspace, correct workspace_id) still cannot insert
-- directly - only service_role may write db_connections at all.
select throws_ok (
  $t4b$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  insert into public.db_connections (workspace_id, connection_type, name, created_by)
  values (
    '0c011001-0000-4000-8000-000000000001'::uuid,
    'postgres'::public.db_connections__connection_type,
    'insider direct insert',
    '0c010001-0000-4000-8000-000000000001'::uuid
  );
  $t4b$,
  '42501',
  null,
  'an insider cannot insert a db_connections row directly, even in their own workspace'
);

-- 4c. An insider cannot update their own db_connections row directly either.
select throws_ok (
  $t4c$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.db_connections
  set name = 'renamed by insider'
  where id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t4c$,
  '42501',
  null,
  'an insider cannot update a db_connections row directly, even their own'
);

-- 4d. An insider cannot delete their own db_connections row directly either.
select throws_ok (
  $t4d$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  delete from public.db_connections where id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t4d$,
  '42501',
  null,
  'an insider cannot delete a db_connections row directly, even their own'
);

-- 6. Anonymous callers cannot reach db_connections through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.db_connections;
  $t6$,
  '42501',
  null,
  'anon cannot select db_connections'
);

-- 7. A member of the owning workspace reads the db_connections__postgres row.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.connection_id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own db_connections__postgres row';
    end if;
  end $chk$;
  $t7$,
  'a member of the owning workspace selects the db_connections__postgres row'
);

-- 8. A member of another workspace reads nothing from db_connections__postgres.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.workspace_id = '0c011001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read db_connections__postgres rows in another workspace';
    end if;
  end $chk$;
  $t8$,
  'a user outside the workspace reads no db_connections__postgres rows'
);

-- 9. An outsider's UPDATE on db_connections__postgres is rejected outright.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.db_connections__postgres
  set host = 'evil.example.org'
  where connection_id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t9$,
  '42501',
  null,
  'an outsider cannot update a db_connections__postgres row in another workspace'
);

-- 10. An outsider's DELETE on db_connections__postgres is rejected outright.
select throws_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.db_connections__postgres where connection_id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t10$,
  '42501',
  null,
  'an outsider cannot delete a db_connections__postgres row in another workspace'
);

-- 9b. The security hole this fix closes: an insider cannot "adopt" a row by
-- inserting their own workspace_id with someone else's vault_secret_id -
-- or any vault_secret_id - directly. Only service_role, via the edge
-- function's own vault.create_secret() call, may write this table.
select throws_ok (
  $t9b$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  insert into public.db_connections__postgres (connection_id, workspace_id, host, port, database_name, username, vault_secret_id)
  values (
    gen_random_uuid(),
    '0c011001-0000-4000-8000-000000000001'::uuid,
    'insider.example.org',
    5432,
    'insider_db',
    'insider_user',
    gen_random_uuid()
  );
  $t9b$,
  '42501',
  null,
  'an insider cannot insert a db_connections__postgres row directly, even in their own workspace'
);

-- 9c. An insider cannot update their own db_connections__postgres row directly.
select throws_ok (
  $t9c$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.db_connections__postgres
  set host = 'renamed-by-insider.example.org'
  where connection_id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t9c$,
  '42501',
  null,
  'an insider cannot update a db_connections__postgres row directly, even their own'
);

-- 9d. An insider cannot delete their own db_connections__postgres row directly.
select throws_ok (
  $t9d$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  delete from public.db_connections__postgres where connection_id = '0c014001-0000-4000-8000-000000000001'::uuid;
  $t9d$,
  '42501',
  null,
  'an insider cannot delete a db_connections__postgres row directly, even their own'
);

-- 11. An outsider cannot insert a db_connections__postgres row either.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.db_connections__postgres (connection_id, workspace_id, host, port, database_name, username, vault_secret_id)
  values (
    '0c014001-0000-4000-8000-000000000001'::uuid,
    '0c011001-0000-4000-8000-000000000001'::uuid,
    'hostile.example.org',
    5432,
    'hostile',
    'hostile_user',
    gen_random_uuid()
  );
  $t11$,
  '42501',
  null,
  'an outsider cannot insert/overwrite a db_connections__postgres row into another workspace'
);

-- 12. Anonymous callers cannot reach db_connections__postgres through the Data API at all.
select throws_ok (
  $t12$
  set local role anon;
  select count(*)::int from public.db_connections__postgres;
  $t12$,
  '42501',
  null,
  'anon cannot select db_connections__postgres'
);

-- 13. A viewer-level data_sources member (not the owner) cannot select
-- db_connections - the minimum role is 'editor', not 'viewer'.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'a viewer-level member selected a db_connections row';
    end if;
  end $chk$;
  $t13$,
  'a viewer-level data_sources member cannot select db_connections (requires editor)'
);

-- 14. An editor-level data_sources member (not the owner) can select
-- db_connections - proves the role check actually passes at the documented
-- threshold, not just rejects below it.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an editor-level member could not select a db_connections row';
    end if;
  end $chk$;
  $t14$,
  'an editor-level data_sources member can select db_connections'
);

-- 15. Same viewer-vs-editor distinction on db_connections__postgres.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.connection_id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'a viewer-level member selected a db_connections__postgres row';
    end if;
  end $chk$;
  $t15$,
  'a viewer-level data_sources member cannot select db_connections__postgres (requires editor)'
);

select lives_ok (
  $t16$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.connection_id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an editor-level member could not select a db_connections__postgres row';
    end if;
  end $chk$;
  $t16$,
  'an editor-level data_sources member can select db_connections__postgres'
);

select * from finish ();

rollback;
