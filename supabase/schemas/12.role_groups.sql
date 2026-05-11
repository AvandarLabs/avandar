-- Named role preset per workspace: built-ins (Global Admin/Editor/Viewer) and
-- custom groups. Assigning a group expands into user_app_roles for that member.
-- is_builtin marks seeded groups; custom groups use is_builtin false.
create table public.role_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  name text not null,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_groups__workspace_id_name unique (
    workspace_id,
    name
  )
);

create index idx_role_groups__workspace_id on public.role_groups (
  workspace_id
);

alter table public.role_groups enable row level security;

create trigger tr_role_groups__set_updated_at before
update on public.role_groups for each row
execute function public.util__set_updated_at ();
