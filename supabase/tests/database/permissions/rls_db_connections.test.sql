\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `db_connections` and `db_connections__postgres`.
 *
 * Unlike `datasets__pdf_file` (gated by `util__auth_user_can_access_resource`),
 * these two tables are gated by app role on `data_sources`
 * (`util__auth_user_meets_min_app_role`), since a connection is
 * infrastructure configuration shared workspace-wide, not a per-resource
 * shareable item (design spec section 5.1). A workspace owner always
 * satisfies any minimum app role, so the insider/outsider pair below uses
 * workspace ownership directly, the same shortcut
 * `util__auth_user_meets_min_app_role` itself takes.
 *
 * Locks both tables' four policies each: a member of one workspace must not
 * read, insert, update, or delete another workspace's rows, and `anon` must
 * not reach either table at all.
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

select plan(12);

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

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
select lives_ok (
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
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.id = '0c014001-0000-4000-8000-000000000001'::uuid and t.name = 'ws a connection'
    ) <> 1 then
      raise exception 'an outsider updated a db_connections row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a db_connections row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.db_connections where id = '0c014001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections t
      where t.id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a db_connections row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a db_connections row in another workspace'
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

-- 9. An outsider's UPDATE on db_connections__postgres is filtered by RLS.
select lives_ok (
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
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.connection_id = '0c014001-0000-4000-8000-000000000001'::uuid and t.host = 'db.example.org'
    ) <> 1 then
      raise exception 'an outsider updated a db_connections__postgres row';
    end if;
  end $chk$;
  $t9$,
  'an outsider cannot update a db_connections__postgres row in another workspace'
);

-- 10. An outsider's DELETE on db_connections__postgres is filtered by RLS.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c010002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.db_connections__postgres where connection_id = '0c014001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.db_connections__postgres t
      where t.connection_id = '0c014001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a db_connections__postgres row';
    end if;
  end $chk$;
  $t10$,
  'an outsider cannot delete a db_connections__postgres row in another workspace'
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

select * from finish ();

rollback;
