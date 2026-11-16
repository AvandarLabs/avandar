\set ON_ERROR_STOP on

/**
 * A Postgres dataset's columns are the only ones its rows route reads from
 * the table the dataset names, through the workspace's saved credential. So
 * only a `data_sources` editor in the dataset's own workspace may add one,
 * nobody may rename a column's `original_name` or move a column into or out
 * of a Postgres dataset, and a dataset's source type cannot change to slip
 * past those rules. Columns of every other dataset type keep their usual
 * rules.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('0c040001-0000-4000-8000-000000000001'::uuid, 'pgcols_owner@test.dev', 'authenticated', 'authenticated'),
  ('0c040002-0000-4000-8000-000000000002'::uuid, 'pgcols_shared_editor@test.dev', 'authenticated', 'authenticated'),
  ('0c040003-0000-4000-8000-000000000003'::uuid, 'pgcols_sources_editor@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('0c041001-0000-4000-8000-000000000001'::uuid, '0c040001-0000-4000-8000-000000000001'::uuid, 'pgcols ws', 'pgcols-ws')
on conflict (id) do nothing;

insert into public.role_groups (id, workspace_id, name, is_builtin)
values
  ('0c047001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, 'pgcols data_sources viewers', false),
  ('0c047002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, 'pgcols data_sources editors', false)
on conflict (id) do nothing;

insert into public.role_group_app_roles (role_group_id, app, role)
values
  ('0c047001-0000-4000-8000-000000000001'::uuid, 'data_sources'::public.app_type, 'viewer'::public.role_level),
  ('0c047002-0000-4000-8000-000000000002'::uuid, 'data_sources'::public.app_type, 'editor'::public.role_level)
on conflict do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values ('0c042001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c040001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values
  ('0c042002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c040002-0000-4000-8000-000000000002'::uuid, '0c047001-0000-4000-8000-000000000001'::uuid),
  ('0c042003-0000-4000-8000-000000000003'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c040003-0000-4000-8000-000000000003'::uuid, '0c047002-0000-4000-8000-000000000002'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('0c043001-0000-4000-8000-000000000001'::uuid, '0c040001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c042001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('0c043002-0000-4000-8000-000000000002'::uuid, '0c040002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c042002-0000-4000-8000-000000000002'::uuid, 'Shared Editor', 'Shared Editor'),
  ('0c043003-0000-4000-8000-000000000003'::uuid, '0c040003-0000-4000-8000-000000000003'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c042003-0000-4000-8000-000000000003'::uuid, 'Sources Editor', 'Sources Editor')
on conflict (id) do nothing;

-- A Postgres dataset and a CSV dataset, both shared as editor with both
-- members, each with one stored column.
insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('0c045001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c040001-0000-4000-8000-000000000001'::uuid, '0c043001-0000-4000-8000-000000000001'::uuid,
   'pgcols postgres dataset', 'postgres_table'::public.datasets__source_type),
  ('0c045002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, '0c040001-0000-4000-8000-000000000001'::uuid, '0c043001-0000-4000-8000-000000000001'::uuid,
   'pgcols csv dataset', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.resource_shares (
  workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
select
  '0c041001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  dataset_id,
  'user'::public.share_principal_type,
  user_id,
  'editor'::public.role_level
from
  (values ('0c045001-0000-4000-8000-000000000001'::uuid), ('0c045002-0000-4000-8000-000000000002'::uuid)) as shared_datasets (dataset_id),
  (values ('0c040002-0000-4000-8000-000000000002'::uuid), ('0c040003-0000-4000-8000-000000000003'::uuid)) as editors (user_id);

insert into public.dataset_columns (
  id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx
)
values
  ('0c046001-0000-4000-8000-000000000001'::uuid, '0c045001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid,
   'full_name', 'full_name', 'text', 'VARCHAR', 'varchar', 0),
  ('0c046002-0000-4000-8000-000000000002'::uuid, '0c045002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid,
   'full_name', 'full_name', 'VARCHAR', 'VARCHAR', 'varchar', 0)
on conflict (id) do nothing;

-- The shared editor owns a second workspace, where they meet every app role.
insert into public.workspaces (id, owner_id, name, slug)
values ('0c041002-0000-4000-8000-000000000002'::uuid, '0c040002-0000-4000-8000-000000000002'::uuid, 'pgcols editor ws', 'pgcols-editor-ws')
on conflict (id) do nothing;

select plan (10);

-- 1. Positive control for 2: the shared editor may rename a Postgres column
-- for display, which reads nothing new from the table.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.dataset_columns
  set name = 'Full name'
  where id = '0c046001-0000-4000-8000-000000000001'::uuid;
  $t1$,
  'a dataset editor can rename a Postgres column''s display name'
);

-- 2. But not the source column it reads.
select throws_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.dataset_columns
  set original_name = 'salary'
  where id = '0c046001-0000-4000-8000-000000000001'::uuid;
  $t2$,
  '23514',
  'a Postgres dataset column cannot be renamed at its source',
  'a dataset editor cannot point a Postgres column at another source column'
);

-- 3. Not even a write that bypasses RLS.
select throws_ok (
  $t3$
  reset role;
  update public.dataset_columns
  set original_name = 'salary'
  where id = '0c046001-0000-4000-8000-000000000001'::uuid;
  $t3$,
  '23514',
  'a Postgres dataset column cannot be renamed at its source',
  'no write can point a Postgres column at another source column'
);

-- 4. Another dataset type keeps its usual rules.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.dataset_columns
  set original_name = 'renamed'
  where id = '0c046002-0000-4000-8000-000000000002'::uuid;
  $t4$,
  'a dataset editor can still change a CSV column''s original name'
);

-- 5. A dataset editor without `data_sources` editor cannot add a column to a
-- Postgres dataset, which would make its rows route read that column.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
  values ('0c045001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, 'salary', 'salary', 'integer', 'VARCHAR', 'bigint', 1);
  $t5$,
  '42501',
  null,
  'only a data_sources editor can add a column to a Postgres dataset'
);

-- 6. Positive control for 5: a `data_sources` editor can.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
  values ('0c045001-0000-4000-8000-000000000001'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, 'joined_on', 'joined_on', 'date', 'VARCHAR', 'date', 1);
  $t6$,
  'a data_sources editor who edits a Postgres dataset can add a column to it'
);

-- 7. And the restriction is Postgres-only: the same editor from 5 can add a
-- column to a CSV dataset.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
  values ('0c045002-0000-4000-8000-000000000002'::uuid, '0c041001-0000-4000-8000-000000000001'::uuid, 'notes', 'notes', 'VARCHAR', 'VARCHAR', 'varchar', 1);
  $t7$,
  'a dataset editor can still add a column to a CSV dataset'
);

-- 8. A column cannot be moved into a Postgres dataset either, which would
-- add it there without `data_sources` editor.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.dataset_columns
  set dataset_id = '0c045001-0000-4000-8000-000000000001'::uuid, original_name = 'salary'
  where id = '0c046002-0000-4000-8000-000000000002'::uuid;
  $t8$,
  '23514',
  'a Postgres dataset column cannot be renamed at its source',
  'a dataset editor cannot move a CSV column into a Postgres dataset'
);

-- 9. The role that counts is the one in the dataset's own workspace, not in
-- whichever workspace the new column row claims.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.dataset_columns (dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
  values ('0c045001-0000-4000-8000-000000000001'::uuid, '0c041002-0000-4000-8000-000000000002'::uuid, 'salary', 'salary', 'integer', 'VARCHAR', 'bigint', 2);
  $t9$,
  '42501',
  null,
  'a column claiming another workspace still needs data_sources editor in the dataset''s own'
);

-- 10. Nor can a dataset editor make the dataset look like another type to
-- slip past these rules.
select throws_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"0c040002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.datasets
  set source_type = 'csv_file'::public.datasets__source_type
  where id = '0c045001-0000-4000-8000-000000000001'::uuid;
  $t10$,
  '23514',
  'dataset source_type cannot be changed',
  'a dataset''s source type cannot be changed'
);

select * from finish ();

rollback;
