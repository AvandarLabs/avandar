-- Per-app role_level for one role_group (one row per app). Expands to
-- user_app_roles when a member is assigned this role_group.
create table public.role_group_app_roles (
  id uuid primary key default gen_random_uuid(),
  role_group_id uuid not null references public.role_groups (id) on update cascade on delete cascade,
  app public.app_type not null,
  role public.role_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_group_app_roles__role_group_id_app unique (
    role_group_id,
    app
  )
);

create index idx_role_group_app_roles__role_group_id on public.role_group_app_roles (
  role_group_id
);

alter table public.role_group_app_roles enable row level security;

create trigger tr_role_group_app_roles__set_updated_at before
update on public.role_group_app_roles for each row
execute function public.util__set_updated_at ();
