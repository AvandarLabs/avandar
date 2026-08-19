-- Named role preset per workspace: built-ins (Global Admin/Editor/Viewer) and
-- custom groups. Members reference one group via workspace_memberships.role_group_id;
-- per-app levels come from role_group_app_roles.
-- `is_builtin` marks groups that were seeded by `util__seed_builtin_role_groups_for_workspace`
-- when the workspace was created.
create table public.role_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  name text not null,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_groups__workspace_id_name unique (workspace_id, name),
  -- role group must either be a bultin group or, if custom, it cannot
  -- have a name matching one of the reserved builtin names
  constraint role_groups__custom_name_not_reserved_builtin check (
    is_builtin or
    lower(btrim(name)) not in (
      'global admin',
      'global editor',
      'global viewer'
    )
  )
);

create index idx_role_groups__workspace_id on public.role_groups (workspace_id);

alter table public.role_groups enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.role_groups to authenticated,
service_role;

create trigger tr_role_groups__set_updated_at before
update on public.role_groups for each row
execute function public.util__set_updated_at ();
