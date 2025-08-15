begin;

create extension if not exists pgcrypto;

-- Uniqueness + perf
create unique index if not exists workspace_memberships_workspace_user_unique
  on public.workspace_memberships (workspace_id, user_id);
create unique index if not exists user_roles_membership_role_unique
  on public.user_roles (membership_id, role);
create index if not exists idx_user_roles_membership_id
  on public.user_roles (membership_id);

-- Ensure FK: user_roles.membership_id -> workspace_memberships(id)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and conname  = 'user_roles_membership_id_fkey'
  ) then
    alter table public.user_roles validate constraint user_roles_membership_id_fkey;
  else
    alter table public.user_roles
      add constraint user_roles_membership_id_fkey
      foreign key (membership_id) references public.workspace_memberships(id)
      on delete cascade not valid;
    alter table public.user_roles validate constraint user_roles_membership_id_fkey;
  end if;
end$$;

-- Normalize updated_at on user_roles
alter table public.user_roles
  alter column updated_at set default timezone('utc'::text, now());
update public.user_roles
  set updated_at = timezone('utc'::text, now())
where updated_at is null;
alter table public.user_roles
  alter column updated_at set not null;

-- RLS
alter table public.workspace_memberships enable row level security;
alter table public.user_profiles        enable row level security;
alter table public.user_roles           enable row level security;

-- SELECT policies (drop if exist, then create)
drop policy if exists select_own_memberships on public.workspace_memberships;
create policy select_own_memberships
on public.workspace_memberships
for select to authenticated
using (user_id = auth.uid());

drop policy if exists select_profiles_in_workspace on public.user_profiles;
create policy select_profiles_in_workspace
on public.user_profiles
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = user_profiles.membership_id
      and wm.workspace_id = user_profiles.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists select_roles_in_workspace on public.user_roles;
create policy select_roles_in_workspace
on public.user_roles
for select to authenticated
using (
  exists (
    select 1
    from public.workspace_memberships wm
    where wm.id = user_roles.membership_id
      and wm.user_id = auth.uid()
  )
);

-- Backfill user_profiles from memberships
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
left join public.user_profiles p
  on p.membership_id = wm.id
left join auth.users u
  on u.id = wm.user_id
where p.id is null;

-- Backfill roles (default 'member') for memberships without any role
insert into public.user_roles (
  id, workspace_id, user_id, membership_id, role, created_at, updated_at
)
select
  gen_random_uuid(),
  wm.workspace_id,
  wm.user_id,
  wm.id,
  'member',
  now(), now()
from public.workspace_memberships wm
left join public.user_roles r
  on r.membership_id = wm.id
where r.membership_id is null;

commit;
