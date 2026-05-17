\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  (
    'f9000001-0000-4000-8000-000000000001'::uuid,
    'wi_inviter@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'f9000002-0000-4000-8000-000000000002'::uuid,
    'wi_viewer@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'f9000003-0000-4000-8000-000000000003'::uuid,
    'wi_admin2@test.dev',
    'authenticated',
    'authenticated'
  ),
  (
    'f9000004-0000-4000-8000-000000000004'::uuid,
    'wi_outsider@test.dev',
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values (
  'f9001001-0000-4000-8000-000000000001'::uuid,
  'f9000001-0000-4000-8000-000000000001'::uuid,
  'workspace invites rls ws',
  'wi-rls-invites-ws'
)
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  (
    'f9002001-0000-4000-8000-000000000001'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000001-0000-4000-8000-000000000001'::uuid
  ),
  (
    'f9002002-0000-4000-8000-000000000002'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000002-0000-4000-8000-000000000002'::uuid
  ),
  (
    'f9002003-0000-4000-8000-000000000003'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000003-0000-4000-8000-000000000003'::uuid
  )
on conflict (id) do nothing;

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.workspace_id = 'f9001001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'f9000001-0000-4000-8000-000000000001'::uuid then 'Global Admin'
    when 'f9000003-0000-4000-8000-000000000003'::uuid then 'Global Admin'
    else 'Global Viewer'
  end;

insert into public.workspace_invites (
  id,
  workspace_id,
  invited_by,
  email,
  role,
  role_group_id,
  invite_status
)
select
  'f9005001-0000-4000-8000-000000000001'::uuid,
  'f9001001-0000-4000-8000-000000000001'::uuid,
  'f9000001-0000-4000-8000-000000000001'::uuid,
  'invited-a@test.dev',
  'member',
  rg.id,
  'pending'::public.workspace_invites__status
from
  public.role_groups rg
where
  rg.workspace_id = 'f9001001-0000-4000-8000-000000000001'::uuid and
  rg.is_builtin and
  rg.name = 'Global Viewer'
limit 1;

select plan(14);

-- 1 Inviter can SELECT their own pending invite
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000001-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::int
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'inviter sees own invite via RLS select'
);

-- 2 Global Viewer member cannot SELECT inviter invite
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000002-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::int
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'viewer does not see inviter invite'
);

-- 3 Second Global Admin (settings admin) can SELECT any invite in workspace
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000003-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::int
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'settings admin sees workspace invite'
);

-- 4 Non-member cannot SELECT invites in workspace
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000004-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::int
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  0,
  'outsider does not see invite'
);

-- 5 Inviter can UPDATE own invite
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000001-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_up_inv$
  update public.workspace_invites wi
  set
    email = 'invited-a-updated@test.dev'
  where
    wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid;
  $wi_up_inv$,
  'inviter updates own invite'
);

-- 6 Settings admin can UPDATE another user invite
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000003-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_up_adm$
  update public.workspace_invites wi
  set
    email = 'invited-a-by-admin@test.dev'
  where
    wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid;
  $wi_up_adm$,
  'settings admin updates invite they did not create'
);

-- 7 Viewer UPDATE on inviter invite affects zero rows (email unchanged)
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000002-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_up_den$
  update public.workspace_invites wi
  set
    email = 'hacker@test.dev'
  where
    wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid;
  $wi_up_den$,
  'viewer update on inviter invite runs without server error'
);

set local role postgres;

select is(
  (
    select wi.email
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  'invited-a-by-admin@test.dev',
  'viewer did not change inviter invite email under RLS'
);

-- 8 Viewer DELETE on inviter invite removes zero rows
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000002-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_del_den$
  delete from public.workspace_invites wi
  where
    wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid;
  $wi_del_den$,
  'viewer delete on inviter invite runs without server error'
);

set local role postgres;

select ok(
  exists (
    select 1
    from public.workspace_invites wi
    where
      wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid
  ),
  'viewer did not delete inviter invite under RLS'
);

-- 9 Settings admin can DELETE any invite in workspace
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000003-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_del_adm$
  delete from public.workspace_invites wi
  where
    wi.id = 'f9005001-0000-4000-8000-000000000001'::uuid;
  $wi_del_adm$,
  'settings admin deletes invite'
);

-- 10 Member can INSERT invite with invited_by = self
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000002-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $wi_ins_ok$
  insert into public.workspace_invites (
    id,
    workspace_id,
    invited_by,
    email,
    role,
    role_group_id,
    invite_status
  )
  select
    'f9005002-0000-4000-8000-000000000002'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000002-0000-4000-8000-000000000002'::uuid,
    'invited-b@test.dev',
    'member',
    rg.id,
    'pending'::public.workspace_invites__status
  from
    public.role_groups rg
  where
    rg.workspace_id = 'f9001001-0000-4000-8000-000000000001'::uuid and
    rg.is_builtin and
    rg.name = 'Global Viewer'
  limit 1;
  $wi_ins_ok$,
  'member inserts invite with self as invited_by'
);

-- 11 INSERT with invited_by != auth.uid() is denied
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000002-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $wi_ins_bad$
  insert into public.workspace_invites (
    id,
    workspace_id,
    invited_by,
    email,
    role,
    role_group_id,
    invite_status
  )
  select
    'f9005003-0000-4000-8000-000000000003'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000001-0000-4000-8000-000000000001'::uuid,
    'spoof@test.dev',
    'member',
    rg.id,
    'pending'::public.workspace_invites__status
  from
    public.role_groups rg
  where
    rg.workspace_id = 'f9001001-0000-4000-8000-000000000001'::uuid and
    rg.is_builtin and
    rg.name = 'Global Viewer'
  limit 1;
  $wi_ins_bad$,
  '42501'
);

-- 12 Non-member INSERT fails (workspace not in auth workspace list)
set local role postgres;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"f9000004-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select throws_ok(
  $wi_ins_out$
  insert into public.workspace_invites (
    id,
    workspace_id,
    invited_by,
    email,
    role,
    role_group_id,
    invite_status
  )
  select
    'f9005004-0000-4000-8000-000000000004'::uuid,
    'f9001001-0000-4000-8000-000000000001'::uuid,
    'f9000004-0000-4000-8000-000000000004'::uuid,
    'outsider-invite@test.dev',
    'member',
    rg.id,
    'pending'::public.workspace_invites__status
  from
    public.role_groups rg
  where
    rg.workspace_id = 'f9001001-0000-4000-8000-000000000001'::uuid and
    rg.is_builtin and
    rg.name = 'Global Viewer'
  limit 1;
  $wi_ins_out$,
  '2202E'
);

select * from finish();

rollback;
