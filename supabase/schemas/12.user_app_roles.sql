-- Each member's role_level per app_type in a workspace (viewer, editor, admin).
-- One row per (workspace, user, app). From role_groups expansion or overrides.
-- Feeds the UI permission catalog and SQL helpers used for enforcement later.
create table public.user_app_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  app public.app_type not null,
  role public.role_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_app_roles__workspace_user_app unique (
    workspace_id,
    user_id,
    app
  )
);

create index idx_user_app_roles__workspace_id on public.user_app_roles (
  workspace_id
);

create index idx_user_app_roles__user_id_workspace_id on public.user_app_roles (
  user_id,
  workspace_id
);

alter table public.user_app_roles enable row level security;

create trigger tr_user_app_roles__set_updated_at before
update on public.user_app_roles for each row
execute function public.util__set_updated_at ();
