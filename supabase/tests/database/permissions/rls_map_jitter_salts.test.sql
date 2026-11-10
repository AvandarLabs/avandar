\set ON_ERROR_STOP on

/**
 * RLS and the read RPC for `map_jitter_salts`.
 *
 * The salt is the key that undoes a published map's displacement, so only a
 * member who can edit the map may read it: not anon, not a viewer, not an
 * outsider. Every map gets its own salt row on insert.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'salts_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2300002-0000-4000-8000-000000000002'::uuid,
    'salts_viewer@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2300003-0000-4000-8000-000000000003'::uuid,
    'salts_editor@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2300004-0000-4000-8000-000000000004'::uuid,
    'salts_outsider@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'maps rls ws',
    'salts-rls-ws'
  ),
  (
    'e2301002-0000-4000-8000-000000000002'::uuid,
    'e2300004-0000-4000-8000-000000000004'::uuid,
    'maps other ws',
    'salts-other-ws'
  )
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e2302001-0000-4000-8000-000000000001'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e2302002-0000-4000-8000-000000000002'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'e2302003-0000-4000-8000-000000000003'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300003-0000-4000-8000-000000000003'::uuid
  ),
  (
    'e2302004-0000-4000-8000-000000000004'::uuid,
    'e2301002-0000-4000-8000-000000000002'::uuid,
    'e2300004-0000-4000-8000-000000000004'::uuid
  )
on conflict (id) do nothing;

insert into public.user_profiles (
  id,
  user_id,
  workspace_id,
  membership_id,
  full_name,
  display_name
)
values
  (
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2302001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'e2303002-0000-4000-8000-000000000002'::uuid,
    'e2300002-0000-4000-8000-000000000002'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2302002-0000-4000-8000-000000000002'::uuid,
    'Viewer',
    'Viewer'
  ),
  (
    'e2303003-0000-4000-8000-000000000003'::uuid,
    'e2300003-0000-4000-8000-000000000003'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2302003-0000-4000-8000-000000000003'::uuid,
    'Editor',
    'Editor'
  ),
  (
    'e2303004-0000-4000-8000-000000000004'::uuid,
    'e2300004-0000-4000-8000-000000000004'::uuid,
    'e2301002-0000-4000-8000-000000000002'::uuid,
    'e2302004-0000-4000-8000-000000000004'::uuid,
    'Outsider',
    'Outsider'
  )
on conflict (id) do nothing;

-- Keep the owner out of the settings-admin path so role checks remain visible.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'e2301001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e2300002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.maps (
  id,
  workspace_id,
  owner_id,
  owner_profile_id,
  name,
  description,
  is_public,
  config,
  is_restricted
)
values
  (
    'e230a001-0000-4000-8000-000000000001'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'shared map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e230a002-0000-4000-8000-000000000002'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'unrestricted map',
    '',
    false,
    '{}'::jsonb,
    false
  ),
  (
    'e230a003-0000-4000-8000-000000000003'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'public map',
    '',
    true,
    '{}'::jsonb,
    true
  ),
  (
    'e230a004-0000-4000-8000-000000000004'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'owner delete map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e230a005-0000-4000-8000-000000000005'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'outsider write map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e230a00a-0000-4000-8000-000000000010'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'e2300001-0000-4000-8000-000000000001'::uuid,
    'e2303001-0000-4000-8000-000000000001'::uuid,
    'profile validation map',
    '',
    false,
    '{}'::jsonb,
    true
  )
on conflict (id) do nothing;

insert into public.resource_shares (
  id,
  workspace_id,
  resource_type,
  resource_id,
  principal_type,
  principal_id,
  role
)
values
  (
    'e2305001-0000-4000-8000-000000000001'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'map'::public.resource_type,
    'e230a001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2300002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'e2305002-0000-4000-8000-000000000002'::uuid,
    'e2301001-0000-4000-8000-000000000001'::uuid,
    'map'::public.resource_type,
    'e230a001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2300003-0000-4000-8000-000000000003'::uuid,
    'editor'::public.role_level
  )
on conflict (id) do nothing;

select plan (14);

-- 1. Every map gets a salt row the moment it is inserted.
select is (
  (
    select count(*)::int
    from public.map_jitter_salts s
    where s.map_id::text like 'e230a%'
  ),
  (
    select count(*)::int
    from public.maps m
    where m.id::text like 'e230a%'
  ),
  'every new map gets a jitter salt row'
);

-- 2. One leaked salt does not unlock another map's displaced points.
select is (
  (
    select count(distinct s.salt)::int
    from public.map_jitter_salts s
    where s.map_id::text like 'e230a%'
  ),
  (
    select count(*)::int
    from public.map_jitter_salts s
    where s.map_id::text like 'e230a%'
  ),
  'each map gets a distinct jitter salt'
);

-- 3. The salt left the maps row, where every map reader could select it.
select hasnt_column (
  'public',
  'maps',
  'jitter_salt',
  'maps no longer carries the jitter salt'
);

-- 4. anon cannot read any salt.
select throws_ok (
  $t4$
  set local role anon;
  select s.salt from public.map_jitter_salts s;
  $t4$,
  '42501',
  null,
  'anon cannot select a jitter salt'
);

reset role;

-- 5. anon cannot call the read RPC.
select throws_ok (
  $t5$
  set local role anon;
  select public.rpc_maps__get_or_create_jitter_salt ('e230a001-0000-4000-8000-000000000001'::uuid);
  $t5$,
  '42501',
  null,
  'anon cannot call rpc_maps__get_or_create_jitter_salt'
);

reset role;

-- 6. A viewer share reads the map, but not its salt.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.map_jitter_salts s
      where s.map_id = 'e230a001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'viewer read the salt';
    end if;
  end $chk$;
  $t6$,
  'a map viewer cannot select the map jitter salt'
);

reset role;

-- 7. The RPC returns nothing to a viewer.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if public.rpc_maps__get_or_create_jitter_salt ('e230a001-0000-4000-8000-000000000001'::uuid) is not null then
      raise exception 'viewer got a salt from the rpc';
    end if;
  end $chk$;
  $t7$,
  'rpc_maps__get_or_create_jitter_salt returns null to a map viewer'
);

reset role;

-- 8. An outsider gets nothing from the table or the RPC.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.map_jitter_salts s
      where s.map_id = 'e230a001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'outsider read the salt';
    end if;
    if public.rpc_maps__get_or_create_jitter_salt ('e230a001-0000-4000-8000-000000000001'::uuid) is not null then
      raise exception 'outsider got a salt from the rpc';
    end if;
  end $chk$;
  $t8$,
  'an outsider cannot read the map jitter salt'
);

reset role;

-- 9. An editor share reads the salt from the table.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.map_jitter_salts s
      where s.map_id = 'e230a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'editor cannot read the salt';
    end if;
  end $chk$;
  $t9$,
  'a map editor selects the map jitter salt'
);

reset role;

-- 10. An editor share reads the same salt through the RPC.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if public.rpc_maps__get_or_create_jitter_salt ('e230a001-0000-4000-8000-000000000001'::uuid) is distinct from (
      select s.salt
      from public.map_jitter_salts s
      where s.map_id = 'e230a001-0000-4000-8000-000000000001'::uuid
    ) then
      raise exception 'rpc salt differs from the stored salt';
    end if;
  end $chk$;
  $t10$,
  'rpc_maps__get_or_create_jitter_salt returns the salt to a map editor'
);

reset role;

-- 11. Even an editor cannot replace a salt and re-key published points.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.map_jitter_salts
  set salt = gen_random_uuid()
  where map_id = 'e230a001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  '42501',
  null,
  'a map editor cannot update the jitter salt'
);

reset role;

-- 12. Nor insert one for a map.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.map_jitter_salts (map_id)
  values ('e230a002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '42501',
  null,
  'a map editor cannot insert a jitter salt'
);

reset role;

-- 13. A map created before salts existed gets one on first editor read.
delete from public.map_jitter_salts
where map_id = 'e230a001-0000-4000-8000-000000000001'::uuid;

select lives_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2300003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if public.rpc_maps__get_or_create_jitter_salt ('e230a001-0000-4000-8000-000000000001'::uuid) is null then
      raise exception 'rpc did not create a missing salt';
    end if;
  end $chk$;
  $t13$,
  'rpc_maps__get_or_create_jitter_salt creates a missing salt for an editor'
);

reset role;

-- 14. Deleting a map deletes its salt.
delete from public.maps
where id = 'e230a001-0000-4000-8000-000000000001'::uuid;

select is (
  (
    select count(*)::int
    from public.map_jitter_salts s
    where s.map_id = 'e230a001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'deleting a map deletes its jitter salt'
);

select * from finish ();

rollback;
