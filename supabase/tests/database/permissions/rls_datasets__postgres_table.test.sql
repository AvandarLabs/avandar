\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `datasets__postgres_table`.
 *
 * Locks this table's four policies: a member of one workspace must not read,
 * insert, update, or delete another workspace's rows, and `anon` must not
 * reach the table at all. Mirrors `rls_datasets__pdf_file.test.sql` exactly -
 * this table is gated by `util__auth_user_can_access_resource('dataset', ...)`
 * the same way every other `datasets__<type>` satellite table is (design
 * spec section 5.1), unlike `db_connections`/`db_connections__postgres`
 * (app-role gated, tested separately in `rls_db_connections.test.sql`).
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('0c020001-0000-4000-8000-000000000001'::uuid, 'pgtable_insider@test.dev', 'authenticated', 'authenticated'),
  ('0c020002-0000-4000-8000-000000000002'::uuid, 'pgtable_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, 'pgtable ws a', 'pgtable-ws-a'),
  ('0c021002-0000-4000-8000-000000000002'::uuid, '0c020002-0000-4000-8000-000000000002'::uuid, 'pgtable ws b', 'pgtable-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('0c022001-0000-4000-8000-000000000001'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid),
  ('0c022002-0000-4000-8000-000000000002'::uuid, '0c021002-0000-4000-8000-000000000002'::uuid, '0c020002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('0c023001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c022001-0000-4000-8000-000000000001'::uuid, 'Insider', 'Insider'),
  ('0c023002-0000-4000-8000-000000000002'::uuid, '0c020002-0000-4000-8000-000000000002'::uuid, '0c021002-0000-4000-8000-000000000002'::uuid, '0c022002-0000-4000-8000-000000000002'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

insert into public.db_connections (
  id, workspace_id, connection_type, name, created_by
)
values (
  '0c024001-0000-4000-8000-000000000001'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'postgres'::public.db_connections__connection_type,
  'ws a connection',
  '0c020001-0000-4000-8000-000000000001'::uuid
)
on conflict (id) do nothing;

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('0c025002-0000-4000-8000-000000000002'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, '0c023001-0000-4000-8000-000000000001'::uuid,
   'ws a postgres dataset', 'postgres_table'::public.datasets__source_type),
  ('0c025003-0000-4000-8000-000000000003'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, '0c023001-0000-4000-8000-000000000001'::uuid,
   'ws a spare dataset', 'postgres_table'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.datasets__postgres_table (
  id, dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind
)
values (
  '0c026001-0000-4000-8000-000000000001'::uuid,
  '0c025002-0000-4000-8000-000000000002'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  '0c024001-0000-4000-8000-000000000001'::uuid,
  'public',
  'customers',
  'table'::public.datasets__postgres_table_relation_kind
)
on conflict (id) do nothing;

select plan (6);

-- 1. A member of the owning workspace reads the row.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__postgres_table t
      where t.id = '0c026001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an insider cannot read their own datasets__postgres_table row';
    end if;
  end $chk$;
  $t1$,
  'a member of the owning workspace selects the datasets__postgres_table row'
);

-- 2. A member of another workspace reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__postgres_table t
      where t.workspace_id = '0c021001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'an outsider read datasets__postgres_table rows in another workspace';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no datasets__postgres_table rows'
);

-- 3. An outsider cannot insert a row claiming the other workspace's dataset.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.datasets__postgres_table (dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind)
  values (
    '0c025003-0000-4000-8000-000000000003'::uuid,
    '0c021001-0000-4000-8000-000000000001'::uuid,
    '0c024001-0000-4000-8000-000000000001'::uuid,
    'public',
    'orders',
    'table'::public.datasets__postgres_table_relation_kind
  );
  $t3$,
  '42501',
  null,
  'an outsider cannot insert a datasets__postgres_table row into another workspace'
);

-- 4. An outsider's UPDATE is filtered by RLS, so the row is untouched.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.datasets__postgres_table
  set table_name = 'renamed_by_outsider'
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__postgres_table t
      where t.id = '0c026001-0000-4000-8000-000000000001'::uuid and t.table_name = 'customers'
    ) <> 1 then
      raise exception 'an outsider updated a datasets__postgres_table row';
    end if;
  end $chk$;
  $t4$,
  'an outsider cannot update a datasets__postgres_table row in another workspace'
);

-- 5. An outsider's DELETE is filtered by RLS, so the row survives.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.datasets__postgres_table where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int from public.datasets__postgres_table t
      where t.id = '0c026001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an outsider deleted a datasets__postgres_table row';
    end if;
  end $chk$;
  $t5$,
  'an outsider cannot delete a datasets__postgres_table row in another workspace'
);

-- 6. Anonymous callers cannot reach the table through the Data API at all.
select throws_ok (
  $t6$
  set local role anon;
  select count(*)::int from public.datasets__postgres_table;
  $t6$,
  '42501',
  null,
  'anon cannot select datasets__postgres_table'
);

select * from finish ();

rollback;
