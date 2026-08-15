\set ON_ERROR_STOP on

/**
 * RLS for `maps`.
 *
 *   viewer: SELECT
 *   editor: SELECT, UPDATE, INSERT (workspace gis editor+ app role)
 *   admin:  SELECT, UPDATE, DELETE
 *
 * Also covers the map-specific visibility rules: a workspace-wide Global
 * Editor with no share cannot read another member's unrestricted map, and
 * `is_public` does not expose a map to anonymous readers.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'maps_owner@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2100002-0000-4000-8000-000000000002'::uuid,
    'maps_viewer@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2100003-0000-4000-8000-000000000003'::uuid,
    'maps_editor@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'e2100004-0000-4000-8000-000000000004'::uuid,
    'maps_outsider@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  (
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'maps rls ws',
    'maps-rls-ws'
  ),
  (
    'e2101002-0000-4000-8000-000000000002'::uuid,
    'e2100004-0000-4000-8000-000000000004'::uuid,
    'maps other ws',
    'maps-other-ws'
  )
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'e2102001-0000-4000-8000-000000000001'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e2102002-0000-4000-8000-000000000002'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'e2102003-0000-4000-8000-000000000003'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100003-0000-4000-8000-000000000003'::uuid
  ),
  (
    'e2102004-0000-4000-8000-000000000004'::uuid,
    'e2101002-0000-4000-8000-000000000002'::uuid,
    'e2100004-0000-4000-8000-000000000004'::uuid
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
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2102001-0000-4000-8000-000000000001'::uuid,
    'Owner',
    'Owner'
  ),
  (
    'e2103002-0000-4000-8000-000000000002'::uuid,
    'e2100002-0000-4000-8000-000000000002'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2102002-0000-4000-8000-000000000002'::uuid,
    'Viewer',
    'Viewer'
  ),
  (
    'e2103003-0000-4000-8000-000000000003'::uuid,
    'e2100003-0000-4000-8000-000000000003'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2102003-0000-4000-8000-000000000003'::uuid,
    'Editor',
    'Editor'
  ),
  (
    'e2103004-0000-4000-8000-000000000004'::uuid,
    'e2100004-0000-4000-8000-000000000004'::uuid,
    'e2101002-0000-4000-8000-000000000002'::uuid,
    'e2102004-0000-4000-8000-000000000004'::uuid,
    'Outsider',
    'Outsider'
  )
on conflict (id) do nothing;

-- Keep the owner out of the settings-admin path so role checks remain visible.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'e2101001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e2100002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
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
    'e210a001-0000-4000-8000-000000000001'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'shared map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e210a002-0000-4000-8000-000000000002'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'unrestricted map',
    '',
    false,
    '{}'::jsonb,
    false
  ),
  (
    'e210a003-0000-4000-8000-000000000003'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'public map',
    '',
    true,
    '{}'::jsonb,
    true
  ),
  (
    'e210a004-0000-4000-8000-000000000004'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'owner delete map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e210a005-0000-4000-8000-000000000005'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'outsider write map',
    '',
    false,
    '{}'::jsonb,
    true
  ),
  (
    'e210a00a-0000-4000-8000-000000000010'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
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
    'e2105001-0000-4000-8000-000000000001'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'map'::public.resource_type,
    'e210a001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2100002-0000-4000-8000-000000000002'::uuid,
    'viewer'::public.role_level
  ),
  (
    'e2105002-0000-4000-8000-000000000002'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'map'::public.resource_type,
    'e210a001-0000-4000-8000-000000000001'::uuid,
    'user'::public.share_principal_type,
    'e2100003-0000-4000-8000-000000000003'::uuid,
    'editor'::public.role_level
  )
on conflict (id) do nothing;

select plan (28);

select isnt(
  to_regprocedure('public.maps__auth_user_may_select_grant(uuid,uuid,uuid,boolean)'),
  null,
  'map-specific grant helper uses the maps namespace'
);

select isnt(
  to_regprocedure('public.maps__auth_user_may_select(uuid)'),
  null,
  'map-specific select helper uses the maps namespace'
);

select is(
  to_regprocedure('public.util__auth_user_may_select_map_grant(uuid,uuid,uuid,boolean)'),
  null,
  'old generic-prefixed map grant helper is absent'
);

select is(
  to_regprocedure('public.util__auth_user_may_select_map(uuid)'),
  null,
  'old generic-prefixed map select helper is absent'
);

-- 1. The owner reads their own restricted map.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'owner cannot select their own map';
    end if;
  end $chk$;
  $t1$,
  'owner selects their own restricted map'
);

-- 2. A viewer share reads the restricted map.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'viewer share cannot select the map';
    end if;
  end $chk$;
  $t2$,
  'a viewer share selects a restricted map'
);

-- 2a. An editor share independently reads the restricted map.
select lives_ok (
  $t2a$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'editor share cannot select the map';
    end if;
  end $chk$;
  $t2a$,
  'an editor share selects a restricted map'
);

-- 3. A Global Editor with no share cannot read another member's unrestricted
-- map because the GIS editor app role is not a public read grant.
select lives_ok (
  $t3$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a002-0000-4000-8000-000000000002'::uuid
    ) <> 0 then
      raise exception 'global editor read an unshared unrestricted map';
    end if;
  end $chk$;
  $t3$,
  'a global editor with no share cannot read an unrestricted map'
);

-- 4. A Global Viewer with no share can read the unrestricted map.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a002-0000-4000-8000-000000000002'::uuid
    ) <> 1 then
      raise exception 'global viewer cannot read an unrestricted map';
    end if;
  end $chk$;
  $t4$,
  'a global viewer reads an unrestricted map in their workspace'
);

-- 5. A member of another workspace reads nothing.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.workspace_id = 'e2101001-0000-4000-8000-000000000001'::uuid
    ) <> 0 then
      raise exception 'outsider read maps in another workspace';
    end if;
  end $chk$;
  $t5$,
  'a user outside the workspace reads no maps'
);

-- 6. Anonymous reads nothing.
select lives_ok (
  $t6$
  set local role anon;
  do $chk$
  begin
    if (select count(*)::int from public.maps) <> 0 then
      raise exception 'anon read a map';
    end if;
  end $chk$;
  $t6$,
  'anon reads no maps'
);

-- 7. `is_public` is reserved for a future public embed and is inert until
-- that route has an explicit access policy and matching coverage.
select lives_ok (
  $t7$
  set local role anon;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a003-0000-4000-8000-000000000003'::uuid
    ) <> 0 then
      raise exception 'anon read a map marked is_public';
    end if;
  end $chk$;
  $t7$,
  'is_public does not make a map anon-readable'
);

-- 8. An outsider cannot insert a map claiming this workspace.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  insert into public.maps (
    workspace_id,
    owner_id,
    owner_profile_id,
    name,
    config
  ) values (
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid,
    'e2103001-0000-4000-8000-000000000001'::uuid,
    'smuggled map',
    '{}'::jsonb
  );
  $t8$,
  '42501',
  null,
  'an outsider cannot insert a map into another workspace'
);

-- 8a. The insert helper independently rejects an outsider for this workspace.
select lives_ok (
  $t8a$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  do $chk$
  begin
    if public.util__auth_user_can_insert_workspace_resource (
      'e2101001-0000-4000-8000-000000000001'::uuid,
      'map'::public.resource_type,
      'e2100004-0000-4000-8000-000000000004'::uuid
    ) then
      raise exception 'outsider insert helper allowed another workspace';
    end if;
  end $chk$;
  $t8a$,
  'the insert helper rejects an outsider for another workspace'
);

-- 9. A Global Viewer cannot insert because INSERT needs a GIS editor role.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  insert into public.maps (
    workspace_id,
    owner_id,
    owner_profile_id,
    name,
    config
  ) values (
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100002-0000-4000-8000-000000000002'::uuid,
    'e2103002-0000-4000-8000-000000000002'::uuid,
    'viewer map',
    '{}'::jsonb
  );
  $t9$,
  '42501',
  null,
  'a viewer app role cannot insert a map'
);

-- 10a. An editor share can update a map.
select lives_ok (
  $t10a$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.maps
  set name = 'renamed by editor'
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where
        m.id = 'e210a001-0000-4000-8000-000000000001'::uuid and
        m.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'editor share could not update the map';
    end if;
  end $chk$;
  $t10a$,
  'an editor share updates a map'
);

-- 10b. A map cannot move to another workspace.
select throws_ok (
  $t10b$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.maps
  set workspace_id = 'e2101002-0000-4000-8000-000000000002'::uuid
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  $t10b$,
  '23514',
  null,
  'a map cannot be moved to another workspace'
);

-- 11. A viewer share cannot delete. RLS filters the DELETE, so the row
-- survives and is checked as the superuser after resetting the role.
select lives_ok (
  $t11$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  delete from public.maps
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'a viewer share deleted a map';
    end if;
  end $chk$;
  $t11$,
  'a viewer share cannot delete a map'
);

-- 11a. An editor share cannot delete. RLS filters the DELETE, so the row
-- survives and is checked as the superuser after resetting the role.
select lives_ok (
  $t11a$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  delete from public.maps
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'an editor share deleted a map';
    end if;
  end $chk$;
  $t11a$,
  'an editor share cannot delete a map'
);

-- 12. An editor share cannot make itself the owner, even with its matching
-- profile. Ownership changes use the controlled transfer path.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  update public.maps
  set
    owner_id = 'e2100003-0000-4000-8000-000000000003'::uuid,
    owner_profile_id = 'e2103003-0000-4000-8000-000000000003'::uuid
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  $t12$,
  '42501',
  null,
  'an editor share cannot change map ownership to itself'
);

-- 13. A self-owned insert cannot use another same-workspace user's profile.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.maps (
    id,
    workspace_id,
    owner_id,
    owner_profile_id,
    name,
    config
  ) values (
    'e210a009-0000-4000-8000-000000000009'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100003-0000-4000-8000-000000000003'::uuid,
    'e2103002-0000-4000-8000-000000000002'::uuid,
    'mismatched profile map',
    '{}'::jsonb
  );
  $t13$,
  '23514',
  null,
  'an editor cannot insert a map with another member profile'
);

-- 14. The owner cannot assign a profile from another workspace.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  update public.maps
  set owner_profile_id = 'e2103004-0000-4000-8000-000000000004'::uuid
  where id = 'e210a00a-0000-4000-8000-000000000010'::uuid;
  $t14$,
  '23514',
  null,
  'an owner cannot assign a profile from another workspace'
);

-- 15. An editor can insert a self-owned map with its matching profile.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}',
    true
  );
  insert into public.maps (
    id,
    workspace_id,
    owner_id,
    owner_profile_id,
    name,
    config
  ) values (
    'e210a007-0000-4000-8000-000000000007'::uuid,
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100003-0000-4000-8000-000000000003'::uuid,
    'e2103003-0000-4000-8000-000000000003'::uuid,
    'editor insert map',
    '{}'::jsonb
  );
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where
        m.id = 'e210a007-0000-4000-8000-000000000007'::uuid and
        m.workspace_id = 'e2101001-0000-4000-8000-000000000001'::uuid and
        m.owner_id = 'e2100003-0000-4000-8000-000000000003'::uuid and
        m.owner_profile_id = 'e2103003-0000-4000-8000-000000000003'::uuid
    ) <> 1 then
      raise exception 'editor insert did not create the expected map';
    end if;
  end $chk$;
  $t15$,
  'an editor inserts a self-owned map'
);

-- 16. The owner can delete a disposable map.
select lives_ok (
  $t16$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100001-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );
  delete from public.maps
  where id = 'e210a004-0000-4000-8000-000000000004'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a004-0000-4000-8000-000000000004'::uuid
    ) <> 0 then
      raise exception 'owner could not delete a map';
    end if;
  end $chk$;
  $t16$,
  'the owner deletes a disposable map'
);

-- 17. An outsider's UPDATE is filtered and leaves the row unchanged.
select lives_ok (
  $t17$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  update public.maps
  set name = 'outsider tried update'
  where id = 'e210a005-0000-4000-8000-000000000005'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where
        m.id = 'e210a005-0000-4000-8000-000000000005'::uuid and
        m.name = 'outsider write map'
    ) <> 1 then
      raise exception 'outsider updated a map';
    end if;
  end $chk$;
  $t17$,
  'an outsider cannot update a map'
);

-- 18. An outsider's DELETE is filtered and the row survives.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
    true
  );
  delete from public.maps
  where id = 'e210a005-0000-4000-8000-000000000005'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where m.id = 'e210a005-0000-4000-8000-000000000005'::uuid
    ) <> 1 then
      raise exception 'outsider deleted a map';
    end if;
  end $chk$;
  $t18$,
  'an outsider cannot delete a map'
);

-- 19. A lower-privilege viewer's UPDATE is filtered and leaves the editor's
-- earlier change intact.
select lives_ok (
  $t19$
  set local role authenticated;
  select set_config(
    'request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}',
    true
  );
  update public.maps
  set name = 'viewer tried update'
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.maps m
      where
        m.id = 'e210a001-0000-4000-8000-000000000001'::uuid and
        m.name = 'renamed by editor'
    ) <> 1 then
      raise exception 'viewer updated a map';
    end if;
  end $chk$;
  $t19$,
  'a viewer cannot update a map'
);

-- 24. The owner guard does not reveal a hidden map to an outsider.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
select is (
  public.maps__owner_id_matches_stored (
    'e210a001-0000-4000-8000-000000000001'::uuid,
    'e2100001-0000-4000-8000-000000000001'::uuid
  ),
  false,
  'the owner guard reveals nothing about a hidden map'
);
reset role;

select * from finish ();

rollback;
