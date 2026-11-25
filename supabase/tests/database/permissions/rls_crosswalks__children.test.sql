\set ON_ERROR_STOP on

/**
 * RLS and integrity for the four crosswalk child tables: layouts, columns,
 * dataset memberships, and mappings.
 *
 * Data Sources viewers read every child of a crosswalk in their
 * workspace, except a membership whose dataset they cannot view. Nobody
 * outside the workspace reads any, and no signed-in user writes any
 * directly: `rpc_crosswalks__save` is the only write path. The composite
 * keys keep a mapping's layout and column, and a membership's layout, in
 * the mapping's own crosswalk. Deletes cascade from the crosswalk, a
 * layout, a column, and a dataset; deleting an entry clears the column's
 * `entry_id`.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('c2000001-0000-4000-8000-000000000001'::uuid, 'cw_children_owner@test.dev', 'authenticated', 'authenticated'),
  ('c2000002-0000-4000-8000-000000000002'::uuid, 'cw_children_viewer@test.dev', 'authenticated', 'authenticated'),
  ('c2000003-0000-4000-8000-000000000003'::uuid, 'cw_children_editor@test.dev', 'authenticated', 'authenticated'),
  ('c2000004-0000-4000-8000-000000000004'::uuid, 'cw_children_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'crosswalk children ws', 'crosswalk-children-ws'),
  ('c2100002-0000-4000-8000-000000000002'::uuid, 'c2000004-0000-4000-8000-000000000004'::uuid, 'crosswalk children other', 'crosswalk-children-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('c2200001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid),
  ('c2200002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000002-0000-4000-8000-000000000002'::uuid),
  ('c2200003-0000-4000-8000-000000000003'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000003-0000-4000-8000-000000000003'::uuid),
  ('c2200004-0000-4000-8000-000000000004'::uuid, 'c2100002-0000-4000-8000-000000000002'::uuid, 'c2000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('c2300001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('c2300002-0000-4000-8000-000000000002'::uuid, 'c2000002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('c2300003-0000-4000-8000-000000000003'::uuid, 'c2000003-0000-4000-8000-000000000003'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('c2300004-0000-4000-8000-000000000004'::uuid, 'c2000004-0000-4000-8000-000000000004'::uuid, 'c2100002-0000-4000-8000-000000000002'::uuid, 'c2200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The viewer gets Global Viewer, the editor Global Editor. The owner owns
-- the workspace and every dataset.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'c2100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'c2000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'c2000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- Kings, Queens, and Bronx everyone in the workspace can see, and a
-- restricted dataset that app roles do not reach.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('c2450001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type, false),
  ('c2450002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Restricted list', 'csv_file'::public.datasets__source_type, true),
  ('c2450003-0000-4000-8000-000000000003'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Queens line list', 'csv_file'::public.datasets__source_type, false),
  ('c2450004-0000-4000-8000-000000000004'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type, false)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('c2400001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values ('c2600001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0);

-- The crosswalk under test, and a second one whose layout and column the
-- composite keys must keep out of the first.
insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name)
values
  ('c2700001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Kings and Queens'),
  ('c2700002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2000001-0000-4000-8000-000000000001'::uuid, 'c2300001-0000-4000-8000-000000000001'::uuid, 'Another crosswalk');

insert into public.crosswalks__layouts (id, workspace_id, crosswalk_id, signature, column_names, is_reference, status)
values
  ('c2710001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.0000000000000001', array['case_id', 'sex'], true, 'mapped'),
  ('c2710002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.0000000000000002', array['CaseNo', 'GENDER'], false, 'to_do'),
  ('c2710009-0000-4000-8000-000000000009'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700002-0000-4000-8000-000000000002'::uuid, 'l1.0000000000000009', array['id'], true, 'mapped');

insert into public.crosswalks__columns (id, workspace_id, crosswalk_id, name, position, data_type, entry_id)
values
  ('c2720001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'case_id', 0, 'varchar', null),
  ('c2720002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'sex', 1, 'varchar', 'c2600001-0000-4000-8000-000000000001'::uuid),
  ('c2720009-0000-4000-8000-000000000009'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700002-0000-4000-8000-000000000002'::uuid, 'id', 0, 'varchar', null);

insert into public.crosswalks__datasets (id, workspace_id, crosswalk_id, dataset_id, layout_id)
values
  ('c2730001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450001-0000-4000-8000-000000000001'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid),
  ('c2730002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450002-0000-4000-8000-000000000002'::uuid, 'c2710002-0000-4000-8000-000000000002'::uuid),
  ('c2730003-0000-4000-8000-000000000003'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450003-0000-4000-8000-000000000003'::uuid, 'c2710002-0000-4000-8000-000000000002'::uuid);

insert into public.crosswalks__mappings (id, workspace_id, crosswalk_id, layout_id, column_id, fill, status, confidence, reason)
values
  ('c2740001-0000-4000-8000-000000000001'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid, 'c2720001-0000-4000-8000-000000000001'::uuid, '{"version":1,"kind":"column","source_column":"case_id","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb, 'confirmed', null, null),
  ('c2740002-0000-4000-8000-000000000002'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid, 'c2720002-0000-4000-8000-000000000002'::uuid, '{"version":1,"kind":"column","source_column":"sex","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb, 'confirmed', null, null),
  ('c2740003-0000-4000-8000-000000000003'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710002-0000-4000-8000-000000000002'::uuid, 'c2720001-0000-4000-8000-000000000001'::uuid, '{"version":1,"kind":"column","source_column":"CaseNo","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb, 'suggested', 0.9, 'name_and_type'),
  ('c2740004-0000-4000-8000-000000000004'::uuid, 'c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710002-0000-4000-8000-000000000002'::uuid, 'c2720002-0000-4000-8000-000000000002'::uuid, '{"version":1,"kind":"column","source_column":"GENDER","convert":null,"code_list_id":null,"holds_labels":false}'::jsonb, 'suggested', 0.5, 'same_values');

-- Counts the rows of one child table of the first crosswalk that a user
-- can read.
create function pg_temp.visible_rows (p_user_id uuid, p_table text) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute format(
    'select count(*)::int from public.%I where crosswalk_id = %L::uuid',
    p_table,
    'c2700001-0000-4000-8000-000000000001'
  )
  into v_count;
  reset role;
  return v_count;
end;
$$;

select plan (33);

-- Reading.

-- 1.
select is (
  pg_temp.visible_rows ('c2000002-0000-4000-8000-000000000002'::uuid, 'crosswalks__layouts'),
  2,
  'a viewer reads the crosswalk''s layouts'
);

-- 2.
select is (
  pg_temp.visible_rows ('c2000002-0000-4000-8000-000000000002'::uuid, 'crosswalks__columns'),
  2,
  'a viewer reads the crosswalk''s columns'
);

-- 3.
select is (
  pg_temp.visible_rows ('c2000002-0000-4000-8000-000000000002'::uuid, 'crosswalks__mappings'),
  4,
  'a viewer reads the crosswalk''s mappings'
);

-- 4.
select is (
  pg_temp.visible_rows ('c2000002-0000-4000-8000-000000000002'::uuid, 'crosswalks__datasets'),
  2,
  'a viewer reads the memberships of the datasets they can view, and not the restricted one'
);

-- 5.
select is (
  pg_temp.visible_rows ('c2000001-0000-4000-8000-000000000001'::uuid, 'crosswalks__datasets'),
  3,
  'the owner of the restricted dataset reads its membership too'
);

-- 6.
select is (
  pg_temp.visible_rows ('c2000004-0000-4000-8000-000000000004'::uuid, 'crosswalks__layouts') +
  pg_temp.visible_rows ('c2000004-0000-4000-8000-000000000004'::uuid, 'crosswalks__columns') +
  pg_temp.visible_rows ('c2000004-0000-4000-8000-000000000004'::uuid, 'crosswalks__datasets') +
  pg_temp.visible_rows ('c2000004-0000-4000-8000-000000000004'::uuid, 'crosswalks__mappings'),
  0,
  'a user outside the workspace reads no child of the crosswalk'
);

-- 7.
select throws_ok (
  $t7$
  set local role anon;
  select count(*) from public.crosswalks__layouts;
  $t7$,
  '42501',
  null,
  'anon cannot select crosswalk layouts'
);
reset role;

-- Direct writes, refused by the missing grants whatever the role.

-- 8.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks__layouts (workspace_id, crosswalk_id, signature, column_names)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.000000000000000a', array['zip']);
  $t8$,
  '42501',
  null,
  'an editor cannot insert a layout directly'
);
reset role;

-- 9.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.crosswalks__columns set name = 'direct' where id = 'c2720001-0000-4000-8000-000000000001'::uuid;
  $t9$,
  '42501',
  null,
  'an editor cannot rename a column directly'
);
reset role;

-- 10.
select throws_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450004-0000-4000-8000-000000000004'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid);
  $t10$,
  '42501',
  null,
  'an editor cannot add a dataset to a crosswalk directly'
);
reset role;

-- 11.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"c2000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.crosswalks__mappings where id = 'c2740003-0000-4000-8000-000000000003'::uuid;
  $t11$,
  '42501',
  null,
  'an editor cannot delete a mapping directly'
);
reset role;

-- Integrity, as the table owner.

-- 12.
select throws_ok (
  $t12$
  insert into public.crosswalks__layouts (workspace_id, crosswalk_id, signature, column_names, is_reference, status)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.0000000000000003', array['zip'], true, 'mapped');
  $t12$,
  '23505',
  null,
  'a crosswalk has at most one reference layout'
);

-- 13.
select throws_ok (
  $t13$
  update public.crosswalks__layouts set status = 'review' where id = 'c2710001-0000-4000-8000-000000000001'::uuid;
  $t13$,
  '23514',
  null,
  'the reference layout is always mapped'
);

-- 14.
select throws_ok (
  $t14$
  insert into public.crosswalks__layouts (workspace_id, crosswalk_id, signature, column_names)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.0000000000000002', array['zip']);
  $t14$,
  '23505',
  null,
  'two layouts of one crosswalk cannot share a signature'
);

-- 15.
select throws_ok (
  $t15$
  insert into public.crosswalks__layouts (workspace_id, crosswalk_id, signature, column_names)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'l1.0000000000000004', array[]::text[]);
  $t15$,
  '23514',
  null,
  'a layout has at least one column'
);

-- 16.
select throws_ok (
  $t16$
  insert into public.crosswalks__columns (workspace_id, crosswalk_id, name, position, data_type)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'CASE_ID', 2, 'varchar');
  $t16$,
  '23505',
  null,
  'two columns of one crosswalk cannot share a name ignoring case'
);

-- 17.
select throws_ok (
  $t17$
  insert into public.crosswalks__columns (workspace_id, crosswalk_id, name, position, data_type)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, ' county ', 2, 'varchar');
  $t17$,
  '23514',
  null,
  'a column name is stored trimmed'
);

-- 18.
select throws_ok (
  $t18$
  insert into public.crosswalks__columns (workspace_id, crosswalk_id, name, position, data_type)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, '', 2, 'varchar');
  $t18$,
  '23514',
  null,
  'a column needs a name'
);

-- 19.
select throws_ok (
  $t19$
  insert into public.crosswalks__mappings (workspace_id, crosswalk_id, layout_id, column_id, fill)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710009-0000-4000-8000-000000000009'::uuid, 'c2720001-0000-4000-8000-000000000001'::uuid, '{"version":1,"kind":"empty"}'::jsonb);
  $t19$,
  '23503',
  null,
  'a mapping cannot use another crosswalk''s layout'
);

-- 20.
select throws_ok (
  $t20$
  insert into public.crosswalks__mappings (workspace_id, crosswalk_id, layout_id, column_id, fill)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid, 'c2720009-0000-4000-8000-000000000009'::uuid, '{"version":1,"kind":"empty"}'::jsonb);
  $t20$,
  '23503',
  null,
  'a mapping cannot fill another crosswalk''s column'
);

-- 21.
select throws_ok (
  $t21$
  insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450004-0000-4000-8000-000000000004'::uuid, 'c2710009-0000-4000-8000-000000000009'::uuid);
  $t21$,
  '23503',
  null,
  'a dataset cannot join another crosswalk''s layout'
);

-- 22.
select throws_ok (
  $t22$
  insert into public.crosswalks__mappings (workspace_id, crosswalk_id, layout_id, column_id, fill)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2710001-0000-4000-8000-000000000001'::uuid, 'c2720001-0000-4000-8000-000000000001'::uuid, '{"version":1,"kind":"empty"}'::jsonb);
  $t22$,
  '23505',
  null,
  'a layout fills a column at most once'
);

-- 23.
select throws_ok (
  $t23$
  update public.crosswalks__mappings set confidence = 1.5 where id = 'c2740003-0000-4000-8000-000000000003'::uuid;
  $t23$,
  '23514',
  null,
  'a confidence is between 0 and 1'
);

-- 24.
select throws_ok (
  $t24$
  update public.crosswalks__mappings set fill = '[]'::jsonb where id = 'c2740003-0000-4000-8000-000000000003'::uuid;
  $t24$,
  '23514',
  null,
  'a fill is an object'
);

-- 25.
select throws_ok (
  $t25$
  insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
  values ('c2100001-0000-4000-8000-000000000001'::uuid, 'c2700001-0000-4000-8000-000000000001'::uuid, 'c2450001-0000-4000-8000-000000000001'::uuid, 'c2710002-0000-4000-8000-000000000002'::uuid);
  $t25$,
  '23505',
  null,
  'a dataset joins one layout of a crosswalk'
);

-- What deletes take with them, as the table owner.

delete from public.data_dictionaries__entries where id = 'c2600001-0000-4000-8000-000000000001'::uuid;

-- 26.
select is (
  (select entry_id from public.crosswalks__columns where id = 'c2720002-0000-4000-8000-000000000002'::uuid),
  null::uuid,
  'deleting an entry keeps the column and clears its entry'
);

delete from public.crosswalks__columns where id = 'c2720002-0000-4000-8000-000000000002'::uuid;

-- 27.
select is (
  (select count(*)::int from public.crosswalks__mappings where column_id = 'c2720002-0000-4000-8000-000000000002'::uuid),
  0,
  'deleting a column deletes its mappings'
);

delete from public.crosswalks__layouts where id = 'c2710002-0000-4000-8000-000000000002'::uuid;

-- 28.
select is (
  (select count(*)::int from public.crosswalks__datasets where layout_id = 'c2710002-0000-4000-8000-000000000002'::uuid) +
  (select count(*)::int from public.crosswalks__mappings where layout_id = 'c2710002-0000-4000-8000-000000000002'::uuid),
  0,
  'deleting a layout deletes its memberships and mappings'
);

delete from public.datasets where id = 'c2450001-0000-4000-8000-000000000001'::uuid;

-- 29.
select is (
  (select count(*)::int from public.crosswalks__datasets where dataset_id = 'c2450001-0000-4000-8000-000000000001'::uuid),
  0,
  'deleting a dataset removes it from every crosswalk'
);

delete from public.crosswalks where id = 'c2700001-0000-4000-8000-000000000001'::uuid;

-- 30.
select is (
  (select count(*)::int from public.crosswalks__layouts where crosswalk_id = 'c2700001-0000-4000-8000-000000000001'::uuid) +
  (select count(*)::int from public.crosswalks__columns where crosswalk_id = 'c2700001-0000-4000-8000-000000000001'::uuid) +
  (select count(*)::int from public.crosswalks__datasets where crosswalk_id = 'c2700001-0000-4000-8000-000000000001'::uuid) +
  (select count(*)::int from public.crosswalks__mappings where crosswalk_id = 'c2700001-0000-4000-8000-000000000001'::uuid),
  0,
  'deleting a crosswalk deletes every child'
);

-- Shape.

-- 31.
select col_type_is ('public', 'crosswalks__layouts', 'status', 'public', 'crosswalks__layout_status', 'a layout''s status is the layout status enum');

-- 32.
select col_type_is ('public', 'crosswalks__mappings', 'reason', 'public', 'crosswalks__mapping_reason', 'a mapping''s reason is the mapping reason enum');

-- 33.
select has_index ('public', 'crosswalks__datasets', 'idx_crosswalks__datasets__dataset_id', 'deleting a dataset finds its memberships by index');

select * from finish ();

rollback;
