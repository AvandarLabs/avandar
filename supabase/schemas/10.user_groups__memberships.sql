create table public.user_group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_group_id uuid not null references public.user_groups (id) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_group_memberships__group_user unique (user_group_id, user_id)
);

create index idx_user_group_memberships__user_id on public.user_group_memberships (user_id);

create index idx_user_group_memberships__user_group_id on public.user_group_memberships (user_group_id);

-- Enable row level security
alter table public.user_group_memberships enable row level security;

-- Data API privileges.
--
-- No UPDATE for the Data API: membership rows are added and removed, never
-- edited in place. `service_role` still gets full DML for backend writes.
grant
select
,
  insert,
  delete on table public.user_group_memberships to authenticated;

grant
select
,
  insert,
update,
delete on table public.user_group_memberships to service_role;

create policy "Members can select user_group_memberships" on public.user_group_memberships for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.user_groups ug
      where
        ug.id = public.user_group_memberships.user_group_id and
        ug.workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces ()
          )
        )
    )
  );

create policy "Settings admins can insert user_group_memberships" on public.user_group_memberships for insert to authenticated
with
  check (
    exists (
      select
        1
      from
        public.user_groups ug
      where
        ug.id = public.user_group_memberships.user_group_id and
        public.util__is_settings_admin (ug.workspace_id)
    )
  );

create policy "Settings admins can delete user_group_memberships" on public.user_group_memberships for delete to authenticated using (
  exists (
    select
      1
    from
      public.user_groups ug
    where
      ug.id = public.user_group_memberships.user_group_id and
      public.util__is_settings_admin (ug.workspace_id)
  )
);

-- When workspace membership ends, remove matching tag memberships in that
-- workspace so labels do not outlive membership.
create or replace function public.user_group_memberships__cleanup_on_workspace_member_removed () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  delete from public.user_group_memberships ugm using public.user_groups ug
  where
    ugm.user_group_id = ug.id and
    ug.workspace_id = old.workspace_id and
    ugm.user_id = old.user_id;
  return old;
end;
$$;

create trigger tr_workspace_memberships__cleanup_user_group_memberships
after delete on public.workspace_memberships for each row
execute function public.user_group_memberships__cleanup_on_workspace_member_removed ();
