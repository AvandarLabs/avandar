begin;

-- Backfill user_profiles from memberships (idempotent)
insert into public.user_profiles (
  id, membership_id, user_id, workspace_id, full_name, display_name, created_at, updated_at
)
select
  gen_random_uuid(),
  wm.id,
  wm.user_id,
  wm.workspace_id,
  coalesce(split_part(u.email, '@', 1), 'Member'),
  coalesce(split_part(u.email, '@', 1), 'Member'),
  now(), now()
from public.workspace_memberships wm
left join public.user_profiles p on p.membership_id = wm.id
left join auth.users u on u.id = wm.user_id
where p.id is null;

-- Backfill roles: uses user_profile_id (NOT user_id)
insert into public.user_roles (
  id, workspace_id, membership_id, user_profile_id, role, created_at, updated_at
)
select
  gen_random_uuid(),
  wm.workspace_id,
  wm.id,
  p.id,
  'member',
  now(), now()
from public.workspace_memberships wm
join public.user_profiles p
  on p.membership_id = wm.id
left join public.user_roles r
  on r.membership_id = wm.id
 and r.role = 'member'
where r.membership_id is null;

commit;
