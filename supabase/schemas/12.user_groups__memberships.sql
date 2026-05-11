create table public.user_group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_group_id uuid not null references public.user_groups (id) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_group_memberships__group_user unique (
    user_group_id,
    user_id
  )
);

create index idx_user_group_memberships__user_id on public.user_group_memberships (user_id);

create index idx_user_group_memberships__user_group_id on public.user_group_memberships (
  user_group_id
);

alter table public.user_group_memberships enable row level security;

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
