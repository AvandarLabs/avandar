\set ON_ERROR_STOP on

/**
 * The second select policy on `data_dictionaries__code_lists`: a user who
 * can view a dataset with a live convert binding reads that binding's code
 * list, whatever their Data Sources role, because the dataset converts
 * through it when it loads. Nothing else opens up: not a list used only by
 * a reference or a pinned binding, not a list a dataset they cannot see
 * converts with, not an unused list, and not the dictionary itself.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d6000001-0000-4000-8000-000000000001'::uuid, 'linked_lists_owner@test.dev', 'authenticated', 'authenticated'),
  ('d6000002-0000-4000-8000-000000000002'::uuid, 'linked_lists_reader@test.dev', 'authenticated', 'authenticated'),
  ('d6000003-0000-4000-8000-000000000003'::uuid, 'linked_lists_viewer@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('d6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'linked lists ws', 'linked-lists-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d6200001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid),
  ('d6200002-0000-4000-8000-000000000002'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000002-0000-4000-8000-000000000002'::uuid),
  ('d6200003-0000-4000-8000-000000000003'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('d6300001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6200001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d6300002-0000-4000-8000-000000000002'::uuid, 'd6000002-0000-4000-8000-000000000002'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6200002-0000-4000-8000-000000000002'::uuid, 'Reader', 'Reader'),
  ('d6300003-0000-4000-8000-000000000003'::uuid, 'd6000003-0000-4000-8000-000000000003'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6200003-0000-4000-8000-000000000003'::uuid, 'Viewer', 'Viewer')
on conflict (id) do nothing;

-- The reader has no app role at all, only shares. The viewer is a Global
-- Viewer, so the existing policy lets them read every list.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'd6100001-0000-4000-8000-000000000001'::uuid and
  wm.user_id = 'd6000003-0000-4000-8000-000000000003'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = 'Global Viewer';

-- A linked dataset (live), a dataset converted in place (pinned), its
-- source (reference), and one the reader cannot see (live).
insert into public.datasets (id, workspace_id, owner_id, owner_profile_id, name, source_type, is_restricted)
values
  ('d6450001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6300001-0000-4000-8000-000000000001'::uuid, 'Kings (labeled)', 'virtual'::public.datasets__source_type, false),
  ('d6450002-0000-4000-8000-000000000002'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6300001-0000-4000-8000-000000000001'::uuid, 'Bronx line list', 'csv_file'::public.datasets__source_type, false),
  ('d6450003-0000-4000-8000-000000000003'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6300001-0000-4000-8000-000000000001'::uuid, 'Kings line list', 'csv_file'::public.datasets__source_type, false),
  ('d6450004-0000-4000-8000-000000000004'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6300001-0000-4000-8000-000000000001'::uuid, 'Queens (labeled)', 'virtual'::public.datasets__source_type, true)
on conflict (id) do nothing;

insert into public.datasets__virtual (dataset_id, workspace_id, raw_sql, linked_source_dataset_id)
values
  ('d6450001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d6450003-0000-4000-8000-000000000003"', 'd6450003-0000-4000-8000-000000000003'::uuid),
  ('d6450004-0000-4000-8000-000000000004'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'SELECT * FROM "d6450003-0000-4000-8000-000000000003"', 'd6450003-0000-4000-8000-000000000003'::uuid);

insert into public.resource_shares (workspace_id, resource_type, resource_id, principal_type, principal_id, role)
values
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'dataset'::public.resource_type, 'd6450001-0000-4000-8000-000000000001'::uuid, 'user'::public.share_principal_type, 'd6000002-0000-4000-8000-000000000002'::uuid, 'viewer'::public.role_level),
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'dataset'::public.resource_type, 'd6450002-0000-4000-8000-000000000002'::uuid, 'user'::public.share_principal_type, 'd6000002-0000-4000-8000-000000000002'::uuid, 'viewer'::public.role_level),
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'dataset'::public.resource_type, 'd6450003-0000-4000-8000-000000000003'::uuid, 'user'::public.share_principal_type, 'd6000002-0000-4000-8000-000000000002'::uuid, 'viewer'::public.role_level);

insert into public.dataset_columns (id, dataset_id, workspace_id, original_name, name, original_data_type, detected_data_type, data_type, column_idx)
values
  ('d6460001-0000-4000-8000-000000000001'::uuid, 'd6450001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d6460002-0000-4000-8000-000000000002'::uuid, 'd6450002-0000-4000-8000-000000000002'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0),
  ('d6460003-0000-4000-8000-000000000003'::uuid, 'd6450003-0000-4000-8000-000000000003'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'bigint', 0),
  ('d6460004-0000-4000-8000-000000000004'::uuid, 'd6450004-0000-4000-8000-000000000004'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'GENDER', 'GENDER', 'BIGINT', 'BIGINT', 'varchar', 0);

insert into public.data_dictionaries (id, workspace_id, owner_id, owner_profile_id, name)
values ('d6400001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6000001-0000-4000-8000-000000000001'::uuid, 'd6300001-0000-4000-8000-000000000001'::uuid, 'NYS codes');

-- One list per way a list can be used, plus one nothing uses.
insert into public.data_dictionaries__code_lists (id, workspace_id, dictionary_id, name, pairs)
values
  ('d6500001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'Live', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d6500002-0000-4000-8000-000000000002'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'Pinned', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d6500003-0000-4000-8000-000000000003'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'Reference', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d6500004-0000-4000-8000-000000000004'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'Hidden live', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb),
  ('d6500005-0000-4000-8000-000000000005'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'Unused', '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb);

insert into public.data_dictionaries__entries (id, workspace_id, dictionary_id, name, kind, position)
values ('d6600001-0000-4000-8000-000000000001'::uuid, 'd6100001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'sex', 'categorical', 0);

insert into public.dataset_columns__dictionary_bindings (workspace_id, dataset_id, dataset_column_id, dictionary_id, entry_id, code_list_id, mode, applied_dictionary_version, pinned_pairs, pinned_is_ordered, replaced_data_type)
values
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'd6450001-0000-4000-8000-000000000001'::uuid, 'd6460001-0000-4000-8000-000000000001'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'd6600001-0000-4000-8000-000000000001'::uuid, 'd6500001-0000-4000-8000-000000000001'::uuid, 'convert', 1, null, null, 'bigint'),
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'd6450002-0000-4000-8000-000000000002'::uuid, 'd6460002-0000-4000-8000-000000000002'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'd6600001-0000-4000-8000-000000000001'::uuid, 'd6500002-0000-4000-8000-000000000002'::uuid, 'convert', 1, '[{"code":"1","label":"Male","accepted_spellings":[],"is_missing":false}]'::jsonb, false, 'bigint'),
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'd6450003-0000-4000-8000-000000000003'::uuid, 'd6460003-0000-4000-8000-000000000003'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'd6600001-0000-4000-8000-000000000001'::uuid, 'd6500003-0000-4000-8000-000000000003'::uuid, 'reference', 1, null, null, null),
  ('d6100001-0000-4000-8000-000000000001'::uuid, 'd6450004-0000-4000-8000-000000000004'::uuid, 'd6460004-0000-4000-8000-000000000004'::uuid, 'd6400001-0000-4000-8000-000000000001'::uuid, 'd6600001-0000-4000-8000-000000000001'::uuid, 'd6500004-0000-4000-8000-000000000004'::uuid, 'convert', 1, null, null, 'bigint');

-- The code lists one user can read, by name.
create function pg_temp.readable_lists (p_user_id uuid) returns text[] language plpgsql as $$
declare
  v_names text[];
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select coalesce(array_agg(cl.name order by cl.name), '{}')
  into v_names
  from public.data_dictionaries__code_lists cl
  where cl.workspace_id = 'd6100001-0000-4000-8000-000000000001'::uuid;
  reset role;
  return v_names;
end;
$$;

-- How many dictionaries one user can read.
create function pg_temp.readable_dictionaries (p_user_id uuid) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*)::int into v_count
  from public.data_dictionaries d
  where d.workspace_id = 'd6100001-0000-4000-8000-000000000001'::uuid;
  reset role;
  return v_count;
end;
$$;

select plan (6);

-- 1.
select is (
  pg_temp.readable_lists ('d6000002-0000-4000-8000-000000000002'::uuid),
  array['Live']::text[],
  'a viewer of a linked dataset reads only the list it converts with live'
);

-- 2.
select is (
  pg_temp.readable_dictionaries ('d6000002-0000-4000-8000-000000000002'::uuid),
  0,
  'reading the list does not open the dictionary'
);

-- 3.
select is (
  pg_temp.readable_lists ('d6000003-0000-4000-8000-000000000003'::uuid),
  array['Hidden live', 'Live', 'Pinned', 'Reference', 'Unused']::text[],
  'a Data Sources viewer still reads every list'
);

-- 4.
select throws_ok (
  $t4$
  set local role anon;
  select count(*) from public.data_dictionaries__code_lists;
  $t4$,
  '42501',
  null,
  'anon still cannot select code lists'
);
reset role;

-- 5.
select ok (
  not has_function_privilege (
    'anon',
    'public.util__auth_user_can_read_code_list_through_binding(uuid)',
    'execute'
  ),
  'anon cannot call the policy''s helper'
);

-- 6.
select ok (
  has_function_privilege (
    'authenticated',
    'public.util__auth_user_can_read_code_list_through_binding(uuid)',
    'execute'
  ),
  'signed-in users can call the policy''s helper, as the policy needs'
);

select * from finish ();

rollback;
