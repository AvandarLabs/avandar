\set ON_ERROR_STOP on

/**
 * `rpc_datasets__get_editable_ids` returns the ids of a workspace's datasets
 * that the caller's effective role lets them edit: an app role or a share of
 * editor or above. A viewer and a user outside the workspace get none.
 */
begin;

set search_path to extensions, public;

-- The ids the RPC returns for a user, sorted, as text.
create function pg_temp.editable_ids_as (p_user_id uuid, p_workspace_id uuid) returns text[] language plpgsql as $$
declare
  v_ids text[];
begin
  execute format(
    $s$
      set local role authenticated;
      select set_config('request.jwt.claims', %L, true);
    $s$,
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text
  );
  select coalesce(array_agg(id::text order by id::text), '{}')
  into v_ids
  from public.rpc_datasets__get_editable_ids (p_workspace_id) id;
  reset role;
  return v_ids;
end;
$$;

insert into auth.users (id, email, aud, role)
values
  ('ed000001-0000-4000-8000-000000000001'::uuid, 'editable_owner@test.dev', 'authenticated', 'authenticated'),
  ('ed000002-0000-4000-8000-000000000002'::uuid, 'editable_viewer@test.dev', 'authenticated', 'authenticated'),
  ('ed000003-0000-4000-8000-000000000003'::uuid, 'editable_outsider@test.dev', 'authenticated', 'authenticated'),
  ('ed000004-0000-4000-8000-000000000004'::uuid, 'editable_shared@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- The owner owns the workspace; the outsider owns another.
insert into public.workspaces (id, owner_id, name, slug)
values
  ('ed100001-0000-4000-8000-000000000001'::uuid, 'ed000001-0000-4000-8000-000000000001'::uuid, 'editable ws', 'editable-ws'),
  ('ed100002-0000-4000-8000-000000000002'::uuid, 'ed000003-0000-4000-8000-000000000003'::uuid, 'editable other ws', 'editable-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('ed200001-0000-4000-8000-000000000001'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed000001-0000-4000-8000-000000000001'::uuid),
  ('ed200002-0000-4000-8000-000000000002'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed000002-0000-4000-8000-000000000002'::uuid),
  ('ed200003-0000-4000-8000-000000000003'::uuid, 'ed100002-0000-4000-8000-000000000002'::uuid, 'ed000003-0000-4000-8000-000000000003'::uuid),
  ('ed200004-0000-4000-8000-000000000004'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed000004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('ed300001-0000-4000-8000-000000000001'::uuid, 'ed000001-0000-4000-8000-000000000001'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('ed300002-0000-4000-8000-000000000002'::uuid, 'ed000002-0000-4000-8000-000000000002'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed200002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('ed300003-0000-4000-8000-000000000003'::uuid, 'ed000003-0000-4000-8000-000000000003'::uuid, 'ed100002-0000-4000-8000-000000000002'::uuid, 'ed200003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider'),
  ('ed300004-0000-4000-8000-000000000004'::uuid, 'ed000004-0000-4000-8000-000000000004'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed200004-0000-4000-8000-000000000004'::uuid, 'Shared', 'Shared')
on conflict (id) do nothing;

-- The viewer gets Global Viewer. The shared user has no app role at all:
-- only an editor share on the first dataset.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'ed100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'ed000002-0000-4000-8000-000000000002'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type)
values
  ('ed450001-0000-4000-8000-000000000001'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed000001-0000-4000-8000-000000000001'::uuid, 'ed300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type),
  ('ed450002-0000-4000-8000-000000000002'::uuid, 'ed100001-0000-4000-8000-000000000001'::uuid, 'ed000001-0000-4000-8000-000000000001'::uuid, 'ed300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type),
  ('ed450003-0000-4000-8000-000000000003'::uuid, 'ed100002-0000-4000-8000-000000000002'::uuid, 'ed000003-0000-4000-8000-000000000003'::uuid, 'ed300003-0000-4000-8000-000000000003'::uuid, 'Other line list', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values (
  'ed100001-0000-4000-8000-000000000001'::uuid,
  'dataset'::public.resource_type,
  'ed450001-0000-4000-8000-000000000001'::uuid,
  'user'::public.share_principal_type,
  'ed000004-0000-4000-8000-000000000004'::uuid,
  'editor'::public.role_level
);

select plan(6);

select is(
  pg_temp.editable_ids_as (
    'ed000001-0000-4000-8000-000000000001'::uuid,
    'ed100001-0000-4000-8000-000000000001'::uuid
  ),
  array[
    'ed450001-0000-4000-8000-000000000001',
    'ed450002-0000-4000-8000-000000000002'
  ],
  'the workspace owner can edit every dataset in it'
);

select is(
  pg_temp.editable_ids_as (
    'ed000002-0000-4000-8000-000000000002'::uuid,
    'ed100001-0000-4000-8000-000000000001'::uuid
  ),
  '{}'::text[],
  'a Global Viewer can edit none'
);

select is(
  pg_temp.editable_ids_as (
    'ed000004-0000-4000-8000-000000000004'::uuid,
    'ed100001-0000-4000-8000-000000000001'::uuid
  ),
  array['ed450001-0000-4000-8000-000000000001'],
  'an editor share makes only the shared dataset editable'
);

select is(
  pg_temp.editable_ids_as (
    'ed000003-0000-4000-8000-000000000003'::uuid,
    'ed100001-0000-4000-8000-000000000001'::uuid
  ),
  '{}'::text[],
  'a user outside the workspace gets none of its datasets'
);

select is(
  pg_temp.editable_ids_as (
    'ed000001-0000-4000-8000-000000000001'::uuid,
    'ed100002-0000-4000-8000-000000000002'::uuid
  ),
  '{}'::text[],
  'another workspace''s datasets never appear'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_datasets__get_editable_ids(uuid)',
    'execute'
  ),
  'anon cannot call it'
);

select * from finish();

rollback;
