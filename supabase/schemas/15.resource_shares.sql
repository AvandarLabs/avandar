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

create index idx_resource_shares__resource on public.resource_shares (resource_type, resource_id);

/**
 * Rejects a share whose workspace does not own the referenced resource.
 *
 * A polymorphic resource id cannot use a conventional foreign key, so this
 * trigger maintains the equivalent workspace invariant for both resource
 * tables.
 */
create or replace function public.resource_shares__validate_resource_workspace () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
  v_resource_workspace_id uuid;
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = new.resource_id;
  elsif new.resource_type = 'dataset'::public.resource_type then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = new.resource_id;
  end if;

  if v_resource_workspace_id is distinct from new.workspace_id then
    raise exception 'resource share workspace must match the resource workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

/** Rejects user and user-group principals outside the resource workspace. */
create or replace function public.resource_shares__validate_principal_workspace () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
  v_is_principal_in_workspace boolean;
begin
  if new.principal_type = 'user'::public.share_principal_type then
    select exists (
      select 1
      from public.workspace_memberships wm
      where
        wm.workspace_id = new.workspace_id and
        wm.user_id = new.principal_id
    ) into v_is_principal_in_workspace;
  elsif new.principal_type = 'user_group'::public.share_principal_type then
    select exists (
      select 1
      from public.user_groups ug
      where
        ug.workspace_id = new.workspace_id and
        ug.id = new.principal_id
    ) into v_is_principal_in_workspace;
  else
    v_is_principal_in_workspace := true;
  end if;

  if not v_is_principal_in_workspace then
    raise exception 'resource share principal must belong to the resource workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Enable row level security
alter table public.resource_shares enable row level security;

create trigger tr__resource_shares__01_validate_resource_workspace before insert or
update on public.resource_shares for each row
execute function public.resource_shares__validate_resource_workspace ();

create trigger tr__resource_shares__02_validate_principal_workspace before insert or
update on public.resource_shares for each row
execute function public.resource_shares__validate_principal_workspace ();

create trigger tr_resource_shares__set_updated_at before
update on public.resource_shares for each row
execute function public.util__set_updated_at ();
