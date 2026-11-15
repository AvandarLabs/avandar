\set ON_ERROR_STOP on

/**
 * `rpc_crosswalks__has_unreadable_datasets` tells a Data Sources editor
 * whether the crosswalk stacks a dataset they cannot view, on a layout that
 * is not skipped: the same question `rpc_crosswalks__save_combined_dataset`
 * refuses on. A viewer, an outsider, and a missing crosswalk all get one
 * refusal, so the function cannot probe for crosswalk ids.
 */
begin;

set search_path to extensions, public;

-- Asks as one user and returns 'true', 'false', or the refusal's hint.
create function pg_temp.ask (p_user_id uuid, p_crosswalk_id uuid default 'c6700001-0000-4000-8000-000000000001'::uuid) returns text language plpgsql as $$
declare
  v_answer boolean;
  v_hint text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v_answer := public.rpc_crosswalks__has_unreadable_datasets (p_crosswalk_id);
  reset role;
  return v_answer::text;
exception
  when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return v_hint;
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('c6000001-0000-4000-8000-000000000001'::uuid, 'cw_unreadable_owner@test.dev', 'authenticated', 'authenticated'),
  ('c6000002-0000-4000-8000-000000000002'::uuid, 'cw_unreadable_editor@test.dev', 'authenticated', 'authenticated'),
  ('c6000003-0000-4000-8000-000000000003'::uuid, 'cw_unreadable_viewer@test.dev', 'authenticated', 'authenticated'),
  ('c6000004-0000-4000-8000-000000000004'::uuid, 'cw_unreadable_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('c6100001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid, 'crosswalk unreadable ws', 'crosswalk-unreadable-ws'),
  ('c6100002-0000-4000-8000-000000000002'::uuid, 'c6000004-0000-4000-8000-000000000004'::uuid, 'crosswalk unreadable other', 'crosswalk-unreadable-other')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('c6200001-0000-4000-8000-000000000001'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid),
  ('c6200002-0000-4000-8000-000000000002'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000002-0000-4000-8000-000000000002'::uuid),
  ('c6200003-0000-4000-8000-000000000003'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000003-0000-4000-8000-000000000003'::uuid),
  ('c6200004-0000-4000-8000-000000000004'::uuid, 'c6100002-0000-4000-8000-000000000002'::uuid, 'c6000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('c6300001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('c6300002-0000-4000-8000-000000000002'::uuid, 'c6000002-0000-4000-8000-000000000002'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6200002-0000-4000-8000-000000000002'::uuid, 'Editor', 'Editor'),
  ('c6300003-0000-4000-8000-000000000003'::uuid, 'c6000003-0000-4000-8000-000000000003'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6200003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer'),
  ('c6300004-0000-4000-8000-000000000004'::uuid, 'c6000004-0000-4000-8000-000000000004'::uuid, 'c6100002-0000-4000-8000-000000000002'::uuid, 'c6200004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The editor gets Global Editor and the viewer Global Viewer. The owner
-- owns the workspace and every dataset in it.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'c6100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id <> 'c6000001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'c6000003-0000-4000-8000-000000000003'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

-- A dataset everyone can view, on the reference layout, and a restricted
-- one the editor cannot view, on another layout.
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('c6450001-0000-4000-8000-000000000001'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid, 'c6300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type, false),
  ('c6450002-0000-4000-8000-000000000002'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid, 'c6300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type, true);

insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name)
values ('c6700001-0000-4000-8000-000000000001'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000001-0000-4000-8000-000000000001'::uuid, 'c6300001-0000-4000-8000-000000000001'::uuid, 'Kings and Bronx');

insert into public.crosswalks__layouts (id, workspace_id, crosswalk_id, signature, column_names, is_reference, status)
values
  ('c6710001-0000-4000-8000-000000000001'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6700001-0000-4000-8000-000000000001'::uuid, 'l1.00000000000000a1', array['case_id'], true, 'mapped'),
  ('c6710002-0000-4000-8000-000000000002'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6700001-0000-4000-8000-000000000001'::uuid, 'l1.00000000000000a2', array['CaseNo'], false, 'to_do');

insert into public.crosswalks__datasets (workspace_id, crosswalk_id, dataset_id, layout_id)
values
  ('c6100001-0000-4000-8000-000000000001'::uuid, 'c6700001-0000-4000-8000-000000000001'::uuid, 'c6450001-0000-4000-8000-000000000001'::uuid, 'c6710001-0000-4000-8000-000000000001'::uuid),
  ('c6100001-0000-4000-8000-000000000001'::uuid, 'c6700001-0000-4000-8000-000000000001'::uuid, 'c6450002-0000-4000-8000-000000000002'::uuid, 'c6710002-0000-4000-8000-000000000002'::uuid);

select plan (10);

-- 1.
select has_function (
  'public',
  'rpc_crosswalks__has_unreadable_datasets',
  array['uuid']::name[],
  'the function takes the crosswalk'
);

-- 2.
select ok (
  has_function_privilege('authenticated', 'public.rpc_crosswalks__has_unreadable_datasets(uuid)', 'execute') and
  not has_function_privilege('anon', 'public.rpc_crosswalks__has_unreadable_datasets(uuid)', 'execute'),
  'signed-in users can call it and anonymous callers cannot'
);

-- 3.
select is (
  pg_temp.ask ('c6000001-0000-4000-8000-000000000001'::uuid),
  'false',
  'the owner can view every member dataset'
);

-- 4.
select is (
  pg_temp.ask ('c6000002-0000-4000-8000-000000000002'::uuid),
  'true',
  'an editor who cannot view a member dataset is told so'
);

update public.crosswalks__layouts
set status = 'skipped'
where id = 'c6710002-0000-4000-8000-000000000002'::uuid;

-- 5.
select is (
  pg_temp.ask ('c6000002-0000-4000-8000-000000000002'::uuid),
  'false',
  'a hidden member on a skipped layout does not count'
);

-- 6.
select is (
  pg_temp.ask ('c6000003-0000-4000-8000-000000000003'::uuid),
  'crosswalk_editor_required',
  'a Data Sources viewer is refused'
);

-- 7.
select is (
  pg_temp.ask ('c6000004-0000-4000-8000-000000000004'::uuid),
  'crosswalk_editor_required',
  'a user outside the workspace is refused'
);

-- 8.
select is (
  pg_temp.ask ('c6000001-0000-4000-8000-000000000001'::uuid, 'c670ffff-0000-4000-8000-00000000ffff'::uuid),
  'crosswalk_editor_required',
  'a crosswalk that does not exist is refused like a forbidden one'
);

update public.crosswalks__layouts
set status = 'to_do'
where id = 'c6710002-0000-4000-8000-000000000002'::uuid;

-- 9. A crosswalk with no members has nothing hidden.
insert into public.crosswalks (id, workspace_id, owner_id, owner_profile_id, name)
values ('c6700002-0000-4000-8000-000000000002'::uuid, 'c6100001-0000-4000-8000-000000000001'::uuid, 'c6000002-0000-4000-8000-000000000002'::uuid, 'c6300002-0000-4000-8000-000000000002'::uuid, 'Empty');

select is (
  pg_temp.ask ('c6000002-0000-4000-8000-000000000002'::uuid, 'c6700002-0000-4000-8000-000000000002'::uuid),
  'false',
  'a crosswalk with no datasets has none hidden'
);

-- 10. A question writes nothing, so it is declared stable.
select is (
  (select provolatile::text from pg_proc where proname = 'rpc_crosswalks__has_unreadable_datasets'),
  's',
  'the function is stable, a read that writes nothing'
);

select * from finish ();

rollback;
