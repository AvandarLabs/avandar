-- Grants a role on one resource (dashboard or dataset) to a principal (see
-- share_principal_type): one user, one user_group tag, or the whole workspace.
-- principal_id is null only for workspace-wide shares.
-- Merged with owner/settings shortcuts and tag-based app roles in
-- util__resource_effective_role using max rank.
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

alter table public.resource_shares enable row level security;

create policy "Members can select resource_shares in their workspaces" on public.resource_shares for
select
  to authenticated using (
    public.resource_shares.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can insert resource_shares" on public.resource_shares for insert to authenticated
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  );

create policy "Settings admins can update resource_shares" on public.resource_shares
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.resource_shares.workspace_id
    )
  );

create policy "Settings admins can delete resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (
    public.resource_shares.workspace_id
  )
);

create trigger tr_resource_shares__set_updated_at before
update on public.resource_shares for each row
execute function public.util__set_updated_at ();
