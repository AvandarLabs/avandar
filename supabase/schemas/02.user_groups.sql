-- Workspace-scoped tag groups used to label members. Membership links users
-- to groups; the granular permissions surface grants resource access through
-- `resource_shares` rows where principal_type = 'user_group'.
create table public.user_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_groups__workspace_id_name unique (workspace_id, name)
);

create index idx_user_groups__workspace_id on public.user_groups (workspace_id);

alter table public.user_groups enable row level security;

-- Data API privileges.
grant
select
,
  insert,
update,
delete on table public.user_groups to authenticated,
service_role;

create trigger tr_user_groups__set_updated_at before
update on public.user_groups for each row
execute function public.util__set_updated_at ();
