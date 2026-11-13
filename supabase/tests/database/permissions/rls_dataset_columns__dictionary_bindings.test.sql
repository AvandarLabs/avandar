\set ON_ERROR_STOP on

/**
 * RLS for `dataset_columns__dictionary_bindings`, and what happens to
 * bindings when the dictionary rows they name go away.
 *
 *   dataset viewer: SELECT the bindings of the datasets they can see
 *   everyone signed in: no INSERT, UPDATE, or DELETE (the apply RPC writes)
 *
 * A dictionary or entry that is deleted takes its reference bindings with
 * it. A code list that is deleted leaves the binding with its description.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('db000001-0000-4000-8000-000000000001'::uuid, 'binding_owner@test.dev', 'authenticated', 'authenticated'),
  ('db000002-0000-4000-8000-000000000002'::uuid, 'binding_viewer@test.dev', 'authenticated', 'authenticated'),
  ('db000003-0000-4000-8000-000000000003'::uuid, 'binding_editor@test.dev', 'authenticated', 'authenticated'),
  ('db000004-0000-4000-8000-000000000004'::uuid, 'binding_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'binding rls ws', 'binding-rls-ws'),
  ('db100002-0000-4000-8000-000000000002'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid, 'binding other ws', 'binding-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('db200001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid),
  ('db200002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000002-0000-4000-8000-000000000002'::uuid),
  ('db200003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000003-0000-4000-8000-000000000003'::uuid),
  ('db200004-0000-4000-8000-000000000004'::uuid, 'db100002-0000-4000-8000-000000000002'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('db300001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('db300002-0000-4000-8000-000000000002'::uuid, 'db000002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('db300003-0000-4000-8000-000000000003'::uuid, 'db000003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db200003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('db300004-0000-4000-8000-000000000004'::uuid, 'db000004-0000-4000-8000-000000000004'::uuid, 'db100002-0000-4000-8000-000000000002'::uuid, 'db200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The viewer gets Global Viewer, the editor Global Editor. The owner owns
-- the workspace.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'db100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'db000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'db000002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- A dataset everyone in the workspace can see, and a restricted one that
-- app roles do not reach.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type, false),
  ('db450002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'Restricted list', 'csv_file'::public.datasets__source_type, true)
on conflict (id) do nothing;

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('db460001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('db460002-0000-4000-8000-000000000002'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('db460003-0000-4000-8000-000000000003'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'hosp_yn', 'hosp_yn', 'VARCHAR', 'VARCHAR', 'varchar', 1)
on conflict (id) do nothing;

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('db400001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db000001-0000-4000-8000-000000000001'::uuid, 'db300001-0000-4000-8000-000000000001'::uuid, 'NYS codes')
on conflict (id) do nothing;

insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('db500001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'Sex (1/2/9)', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('db500002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'Yes/No', '[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values
  ('db600001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0),
  ('db600002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'hospitalized', 'categorical', 1);

insert into public.data_dictionaries__entry_codings (workspace_id, dictionary_id, entry_id, code_list_id, is_primary)
values
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, true),
  ('db100001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 'db500002-0000-4000-8000-000000000002'::uuid, true);

insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, applied_dictionary_version)
values
  ('db470001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460001-0000-4000-8000-000000000001'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, 1),
  ('db470002-0000-4000-8000-000000000002'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid, 'db460002-0000-4000-8000-000000000002'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600001-0000-4000-8000-000000000001'::uuid, 'db500001-0000-4000-8000-000000000001'::uuid, 1),
  ('db470003-0000-4000-8000-000000000003'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460003-0000-4000-8000-000000000003'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 'db500002-0000-4000-8000-000000000002'::uuid, 1);

-- Counts the bindings a user can read on one dataset.
create function pg_temp.visible_bindings (p_user_id uuid, p_dataset_id uuid) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*)::int into v_count
  from public.dataset_columns__dictionary_bindings
  where dataset_id = p_dataset_id;
  reset role;
  return v_count;
end;
$$;

select plan (16);

-- 1.
select is (
  pg_temp.visible_bindings ('db000002-0000-4000-8000-000000000002'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid),
  2,
  'a viewer reads the bindings of a dataset they can see'
);

-- 2.
select is (
  pg_temp.visible_bindings ('db000002-0000-4000-8000-000000000002'::uuid, 'db450002-0000-4000-8000-000000000002'::uuid),
  0,
  'a viewer reads no binding of a dataset they cannot see'
);

-- 3.
select is (
  pg_temp.visible_bindings ('db000004-0000-4000-8000-000000000004'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid),
  0,
  'a user outside the workspace reads no binding'
);

-- 4.
select throws_ok (
  $t4$
  set local role anon;
  select count(*) from public.dataset_columns__dictionary_bindings;
  $t4$,
  '42501',
  null,
  'anon cannot select bindings'
);
reset role;

-- 5.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.dataset_columns__dictionary_bindings (workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, applied_dictionary_version)
  values ('db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460003-0000-4000-8000-000000000003'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, 1);
  $t5$,
  '42501',
  null,
  'an editor cannot insert a binding directly'
);
reset role;

-- 6.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.dataset_columns__dictionary_bindings set code_list_id = null where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t6$,
  '42501',
  null,
  'an editor cannot update a binding directly'
);
reset role;

-- 7.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.dataset_columns__dictionary_bindings where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t7$,
  '42501',
  null,
  'even the workspace owner cannot delete a binding directly'
);
reset role;

-- 8.
select throws_ok (
  $t8$
  update public.dataset_columns__dictionary_bindings
  set workspace_id = 'db100002-0000-4000-8000-000000000002'::uuid
  where id = 'db470001-0000-4000-8000-000000000001'::uuid;
  $t8$,
  '23514',
  null,
  'a binding cannot move to another workspace'
);

-- A convert binding, which no apply can write yet, on a fourth column. A
-- deleted entry or dictionary must leave it in place.
insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values ('db460004-0000-4000-8000-000000000004'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'hosp_code', 'hosp_code', 'VARCHAR', 'VARCHAR', 'varchar', 2);

insert into public.dataset_columns__dictionary_bindings (id, workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, mode, applied_dictionary_version)
values ('db470004-0000-4000-8000-000000000004'::uuid, 'db100001-0000-4000-8000-000000000001'::uuid, 'db450001-0000-4000-8000-000000000001'::uuid, 'db460004-0000-4000-8000-000000000004'::uuid, 'db400001-0000-4000-8000-000000000001'::uuid, 'db600002-0000-4000-8000-000000000002'::uuid, null, 'convert', 1);

-- 9. A save that gives hospitalized a new code list deletes Yes/No.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_data_dictionaries__save (
    'db400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"db500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]},{"id":"db500003-0000-4000-8000-000000000003","name":"Y/N/U","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[{"id":"db600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"db500001-0000-4000-8000-000000000001","is_primary":true}]},{"id":"db600002-0000-4000-8000-000000000002","name":"hospitalized","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":1,"codings":[{"code_list_id":"db500003-0000-4000-8000-000000000003","is_primary":true}]}]'::jsonb
  );
  $t9$,
  'a save that deletes a code list a binding uses succeeds'
);
reset role;

-- 10.
select results_eq (
  $q$
    select entry_id, code_list_id
    from public.dataset_columns__dictionary_bindings
    where id = 'db470003-0000-4000-8000-000000000003'::uuid
  $q$,
  $q$ values ('db600002-0000-4000-8000-000000000002'::uuid, null::uuid) $q$,
  'the binding keeps its entry, and its description, when its code list is deleted'
);

-- 11. A save that leaves hospitalized out deletes the entry.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_data_dictionaries__save (
    'db400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"db500001-0000-4000-8000-000000000001","name":"Sex (1/2/9)","is_ordered":false,"pairs":[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[{"id":"db600001-0000-4000-8000-000000000001","name":"sex","column_names":[],"kind":"categorical","unit":null,"valid_min":null,"valid_max":null,"description":null,"position":0,"codings":[{"code_list_id":"db500001-0000-4000-8000-000000000001","is_primary":true}]}]'::jsonb
  );
  $t11$,
  'the owner saves the dictionary without the hospitalized entry'
);
reset role;

-- 12.
select results_eq (
  'select id from public.dataset_columns__dictionary_bindings where mode = ''reference'' and workspace_id = ''db100001-0000-4000-8000-000000000001''::uuid order by id',
  $$ values ('db470001-0000-4000-8000-000000000001'::uuid), ('db470002-0000-4000-8000-000000000002'::uuid) $$,
  'a deleted entry takes its reference bindings with it'
);

-- 13.
select results_eq (
  $q$
    select dictionary_id, entry_id
    from public.dataset_columns__dictionary_bindings
    where id = 'db470004-0000-4000-8000-000000000004'::uuid
  $q$,
  $q$ values ('db400001-0000-4000-8000-000000000001'::uuid, null::uuid) $q$,
  'a deleted entry leaves a convert binding in place'
);

-- 14. The owner may delete the dictionary without editing either dataset.
select lives_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"db000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.data_dictionaries where id = 'db400001-0000-4000-8000-000000000001'::uuid;
  $t14$,
  'the owner deletes the dictionary'
);
reset role;

-- 15.
select is (
  (
    select count(*)::int
    from public.dataset_columns__dictionary_bindings
    where mode = 'reference' and workspace_id = 'db100001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'a deleted dictionary takes its reference bindings with it'
);

-- 16.
select results_eq (
  $q$
    select dictionary_id, entry_id
    from public.dataset_columns__dictionary_bindings
    where id = 'db470004-0000-4000-8000-000000000004'::uuid
  $q$,
  $q$ values (null::uuid, null::uuid) $q$,
  'a deleted dictionary leaves a convert binding in place'
);

select * from finish ();

rollback;
