\set ON_ERROR_STOP on

/**
 * Cross-tenant RLS for `datasets__postgres_table`.
 *
 * Locks this table's four policies: a member of one workspace must not read,
 * insert, update, or delete another workspace's rows, and `anon` must not
 * reach the table at all. Mirrors `rls_datasets__pdf_file.test.sql` exactly -
 * this table is gated by `util__auth_user_can_access_resource('dataset', ...)`
 * the same way every other `datasets__<type>` satellite table is, unlike
 * `connections`/`connections__postgres` (app-role gated, tested
 * separately in `rls_connections.test.sql`).
 *
 * A row also decides which table anyone who can see its dataset reads
 * through the workspace's saved credential, so only a `data_sources` editor
 * may create one, no signed-in user may update one, and not even a
 * service-role write may move one onto another dataset or point it at
 * another connection or table.
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

insert into public.connections (
  id, workspace_id, connection_type, name, created_by
)
values (
  '0c024001-0000-4000-8000-000000000001'::uuid,
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'postgres'::public.connections__connection_type,
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
   'ws a spare dataset', 'postgres_table'::public.datasets__source_type),
  ('0c025004-0000-4000-8000-000000000004'::uuid, '0c021002-0000-4000-8000-000000000002'::uuid, '0c020002-0000-4000-8000-000000000002'::uuid, '0c023002-0000-4000-8000-000000000002'::uuid,
   'ws b postgres dataset', 'postgres_table'::public.datasets__source_type)
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

-- A member who can edit the spare dataset through a share, but holds only
-- `data_sources` viewer, so may not pick which table it reads.
insert into auth.users (id, email, aud, role)
values ('0c020003-0000-4000-8000-000000000003'::uuid, 'pgtable_shared_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('0c027001-0000-4000-8000-000000000001'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, 'pgtable data_sources viewers', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values ('0c027001-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'viewer'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values ('0c022003-0000-4000-8000-000000000003'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020003-0000-4000-8000-000000000003'::uuid, '0c027001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values ('0c023003-0000-4000-8000-000000000003'::uuid, '0c020003-0000-4000-8000-000000000003'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c022003-0000-4000-8000-000000000003'::uuid, 'Shared Editor', 'Shared Editor')
on conflict (id) do nothing;

insert into public.resource_shares (
  workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  '0c025003-0000-4000-8000-000000000003'::uuid,
  'user'::public.share_principal_type,
  '0c020003-0000-4000-8000-000000000003'::uuid,
  'editor'::public.role_level
);

-- A member who holds `data_sources` editor and edits a second spare dataset,
-- the positive control for the insert policy.
insert into auth.users (id, email, aud, role)
values ('0c020004-0000-4000-8000-000000000004'::uuid, 'pgtable_sources_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values ('0c027002-0000-4000-8000-000000000002'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, 'pgtable data_sources editors', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values ('0c027002-0000-4000-8000-000000000002'::uuid, 'data_sources'::public.app_type, 'editor'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values ('0c022004-0000-4000-8000-000000000004'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020004-0000-4000-8000-000000000004'::uuid, '0c027002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values ('0c023004-0000-4000-8000-000000000004'::uuid, '0c020004-0000-4000-8000-000000000004'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c022004-0000-4000-8000-000000000004'::uuid, 'Sources Editor', 'Sources Editor')
on conflict (id) do nothing;

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values ('0c025005-0000-4000-8000-000000000005'::uuid, '0c021001-0000-4000-8000-000000000001'::uuid, '0c020001-0000-4000-8000-000000000001'::uuid, '0c023001-0000-4000-8000-000000000001'::uuid,
   'ws a second spare dataset', 'postgres_table'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.resource_shares (
  workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values (
  '0c021001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  '0c025005-0000-4000-8000-000000000005'::uuid,
  'user'::public.share_principal_type,
  '0c020004-0000-4000-8000-000000000004'::uuid,
  'editor'::public.role_level
);

select plan (17);

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

-- 4. An outsider cannot update a row, since no signed-in user may.
select throws_ok (
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
  $t4$,
  '42501',
  null,
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

-- 7. A dataset cannot read through another workspace's connection, even when
-- RLS is bypassed: the foreign key itself ties the connection to the
-- dataset's own workspace.
select throws_ok (
  $t7$
  reset role;
  insert into public.datasets__postgres_table (dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind)
  values (
    '0c025004-0000-4000-8000-000000000004'::uuid,
    '0c021002-0000-4000-8000-000000000002'::uuid,
    '0c024001-0000-4000-8000-000000000001'::uuid,
    'public',
    'customers',
    'table'::public.datasets__postgres_table_relation_kind
  );
  $t7$,
  '23503',
  null,
  'a datasets__postgres_table row cannot reference a connection in another workspace'
);

-- 8. Nor can a row claim the connection's workspace while belonging to a
-- dataset in another workspace: the row's workspace is keyed to its
-- dataset's, so the connection's workspace is the dataset's too.
select throws_ok (
  $t8$
  reset role;
  insert into public.datasets__postgres_table (dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind)
  values (
    '0c025004-0000-4000-8000-000000000004'::uuid,
    '0c021001-0000-4000-8000-000000000001'::uuid,
    '0c024001-0000-4000-8000-000000000001'::uuid,
    'public',
    'customers',
    'table'::public.datasets__postgres_table_relation_kind
  );
  $t8$,
  '23503',
  null,
  'a datasets__postgres_table row cannot claim a workspace other than its dataset''s'
);

-- 9. An existing row cannot be moved to another workspace either.
select throws_ok (
  $t9$
  reset role;
  update public.datasets__postgres_table
  set workspace_id = '0c021002-0000-4000-8000-000000000002'::uuid
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t9$,
  '23503',
  null,
  'a datasets__postgres_table row cannot be moved to a workspace other than its dataset''s'
);

-- 10. Nor can a row be moved onto a dataset in another workspace while
-- keeping its own workspace.
select throws_ok (
  $t10$
  reset role;
  update public.datasets__postgres_table
  set dataset_id = '0c025004-0000-4000-8000-000000000004'::uuid
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t10$,
  '23514',
  'a Postgres dataset cannot be repointed at another table',
  'a datasets__postgres_table row cannot be moved onto another workspace''s dataset'
);

-- 11. Positive control for 12: the shared editor really can edit the spare
-- dataset, so a refused insert is down to the app role alone.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if not public.util__auth_user_can_access_resource (
      'dataset',
      '0c025003-0000-4000-8000-000000000003'::uuid,
      'editor'
    ) then
      raise exception 'the shared editor cannot edit the spare dataset';
    end if;
  end $chk$;
  $t11$,
  'a member the dataset is shared with as editor can edit it'
);

-- 12. That editor still cannot pick the table a Postgres dataset reads,
-- because they are not a `data_sources` editor.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.datasets__postgres_table (dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind)
  values (
    '0c025003-0000-4000-8000-000000000003'::uuid,
    '0c021001-0000-4000-8000-000000000001'::uuid,
    '0c024001-0000-4000-8000-000000000001'::uuid,
    'public',
    'payroll',
    'table'::public.datasets__postgres_table_relation_kind
  );
  $t12$,
  '42501',
  null,
  'only a data_sources editor can create a datasets__postgres_table row'
);

-- 13. No signed-in user may update a row, not even the workspace owner.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.datasets__postgres_table
  set table_name = 'payroll'
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t13$,
  '42501',
  null,
  'not even the workspace owner can update a datasets__postgres_table row'
);

-- 14. A write that bypasses RLS cannot repoint a row at another table either.
select throws_ok (
  $t15$
  reset role;
  update public.datasets__postgres_table
  set table_name = 'payroll'
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t15$,
  '23514',
  'a Postgres dataset cannot be repointed at another table',
  'a datasets__postgres_table row cannot be repointed at another table'
);

-- 15. Nor move a row onto another dataset in its own workspace, which would
-- make that dataset's viewers read this row's table.
select throws_ok (
  $t16$
  reset role;
  update public.datasets__postgres_table
  set dataset_id = '0c025003-0000-4000-8000-000000000003'::uuid
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t16$,
  '23514',
  'a Postgres dataset cannot be repointed at another table',
  'a datasets__postgres_table row cannot be moved onto another dataset in its workspace'
);

-- 16. Nor at another connection, whatever role makes the change.
select throws_ok (
  $t14$
  reset role;
  insert into public.connections (id, workspace_id, connection_type, name, created_by)
  values (
    '0c024002-0000-4000-8000-000000000002'::uuid,
    '0c021001-0000-4000-8000-000000000001'::uuid,
    'postgres'::public.connections__connection_type,
    'ws a second connection',
    '0c020001-0000-4000-8000-000000000001'::uuid
  );
  update public.datasets__postgres_table
  set connection_id = '0c024002-0000-4000-8000-000000000002'::uuid
  where id = '0c026001-0000-4000-8000-000000000001'::uuid;
  $t14$,
  '23514',
  'a Postgres dataset cannot be repointed at another table',
  'a datasets__postgres_table row cannot be repointed at another connection'
);

-- 17. A `data_sources` editor who edits a dataset may create its row, the
-- positive control for test 12.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c020004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.datasets__postgres_table (dataset_id, workspace_id, connection_id, schema_name, table_name, relation_kind)
  values (
    '0c025005-0000-4000-8000-000000000005'::uuid,
    '0c021001-0000-4000-8000-000000000001'::uuid,
    '0c024001-0000-4000-8000-000000000001'::uuid,
    'public',
    'orders',
    'table'::public.datasets__postgres_table_relation_kind
  );
  $t17$,
  'a data_sources editor who edits the dataset can create its datasets__postgres_table row'
);

select * from finish ();

rollback;
