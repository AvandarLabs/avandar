\set ON_ERROR_STOP on

/**
 * `rpc_datasets__add_places_dataset` creates a virtual dataset flagged as a
 * places dataset, with its columns, in one call. Only a workspace admin may
 * create one, and the plain virtual dataset RPC still leaves the flag off.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'places_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'places_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'places ws', 'places-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
values ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, null)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values ('a7003001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7002001-0000-4000-8000-000000000001'::uuid, 'Places Owner', 'Places Owner')
on conflict (id) do nothing;

select plan (7);

-- 1.
select has_column (
  'public',
  'datasets__virtual',
  'is_places',
  'datasets__virtual has an is_places flag'
);

-- 2.
select col_default_is (
  'public',
  'datasets__virtual',
  'is_places',
  'false',
  'is_places defaults to false'
);

-- 3.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_datasets__add_places_dataset (
    'a7004001-0000-4000-8000-000000000001'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Exposure sites',
    '',
    array[
      row('place_id', 'place_id', '', 'VARCHAR', 'VARCHAR', 'varchar', 0)::public.dataset_column_input,
      row('latitude', 'latitude', '', 'DOUBLE', 'DOUBLE', 'double', 1)::public.dataset_column_input
    ],
    'SELECT CAST(NULL AS VARCHAR) AS place_id, CAST(NULL AS DOUBLE) AS latitude WHERE false'
  );
  $t3$,
  'the workspace owner creates a places dataset'
);

reset role;

-- 4.
select is (
  (select is_places from public.datasets__virtual where dataset_id = 'a7004001-0000-4000-8000-000000000001'::uuid),
  true,
  'the places RPC flags its virtual row'
);

-- 5.
select is (
  (select count(*)::integer from public.dataset_columns where dataset_id = 'a7004001-0000-4000-8000-000000000001'::uuid),
  2,
  'the places RPC writes the columns it was given'
);

-- 6.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_datasets__add_virtual_dataset (
    'a7004002-0000-4000-8000-000000000002'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Plain query',
    '',
    array[row('one', 'one', '', 'INTEGER', 'INTEGER', 'bigint', 0)::public.dataset_column_input],
    'SELECT 1 AS one'
  );
  reset role;
  do $check$
  begin
    if (select is_places from public.datasets__virtual where dataset_id = 'a7004002-0000-4000-8000-000000000002'::uuid) then
      raise exception 'plain virtual dataset was flagged as places';
    end if;
  end
  $check$;
  $t6$,
  'the plain virtual RPC leaves is_places false'
);

reset role;

-- 7.
select throws_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_datasets__add_places_dataset (
    'a7004003-0000-4000-8000-000000000003'::uuid,
    'a7001001-0000-4000-8000-000000000001'::uuid,
    'Not mine',
    '',
    array[]::public.dataset_column_input[],
    'SELECT 1 AS one'
  );
  $t7$,
  'The requesting user is not an admin of this workspace',
  'a user outside the workspace cannot create a places dataset'
);

reset role;

select * from finish();

rollback;
