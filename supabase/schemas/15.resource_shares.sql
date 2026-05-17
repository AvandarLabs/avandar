-- Grants a role on one resource (dashboard or dataset) to a principal (see
-- share_principal_type): one user, one user_group tag, or the whole workspace.
-- principal_id is null only for workspace-wide shares.
-- requires_app_access only applies when principal_type = 'user_group';
-- when true, members of that group also need any role on the resource's app
-- for the share to contribute (see util__resource_effective_role).
-- Merged with owner/settings shortcuts and the workspace app-role candidate
-- in util__resource_effective_role using max rank.
create table public.resource_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  resource_type public.resource_type not null,
  resource_id uuid not null,
  principal_type public.share_principal_type not null,
  principal_id uuid,
  role public.role_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  requires_app_access boolean not null default false,
  constraint resource_shares__principal_shape check (
    (
      principal_type = 'user'::public.share_principal_type and
      principal_id is not null
    ) or
    (
      principal_type = 'user_group'::public.share_principal_type and
      principal_id is not null
    ) or
    (
      principal_type = 'workspace'::public.share_principal_type and
      principal_id is null
    )
  ),
  constraint resource_shares__requires_app_access_only_for_groups check (
    requires_app_access = false or
    principal_type = 'user_group'::public.share_principal_type
  )
);

create unique index resource_shares__uniq_workspace_principal on public.resource_shares (
  resource_type,
  resource_id,
  principal_type
)
where
  principal_type = 'workspace';

create unique index resource_shares__uniq_user_principal on public.resource_shares (
  resource_type,
  resource_id,
  principal_type,
  principal_id
)
where
  principal_type = 'user';

create unique index resource_shares__uniq_user_group_principal on public.resource_shares (
  resource_type,
  resource_id,
  principal_type,
  principal_id
)
where
  principal_type = 'user_group';

create index idx_resource_shares__resource on public.resource_shares (
  resource_type,
  resource_id
);

-- Enable row level security
alter table public.resource_shares enable row level security;

create trigger tr_resource_shares__set_updated_at before
update on public.resource_shares for each row
execute function public.util__set_updated_at ();
