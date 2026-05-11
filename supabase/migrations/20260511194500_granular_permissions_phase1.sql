-- Phase 1 granular permissions: enums, tables, helpers, RLS.
-- Declarative sources: supabase/schemas/01.*, 12.*, 15.*, 16.*, 17.*
create type public.app_type as enum(
  'data_sources',
  'data_explorer',
  'dashboards',
  'settings'
);
create type public.resource_type as enum(
  'dashboard',
  'dataset'
);
create type public.role_level as enum(
  'viewer',
  'editor',
  'admin'
);
create type public.share_principal_type as enum(
  'user',
  'user_group',
  'workspace'
);
create table public.role_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  name text not null,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_groups__workspace_id_name unique (workspace_id, name)
);

create index idx_role_groups__workspace_id on public.role_groups (workspace_id);

alter table public.role_groups enable row level security;

create trigger tr_role_groups__set_updated_at before
update on public.role_groups for each row
execute function public.util__set_updated_at ();
create table public.role_group_app_roles (
  id uuid primary key default gen_random_uuid(),
  role_group_id uuid not null references public.role_groups (id) on update cascade on delete cascade,
  app public.app_type not null,
  role public.role_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_group_app_roles__role_group_id_app unique (role_group_id, app)
);

create index idx_role_group_app_roles__role_group_id on public.role_group_app_roles (
  role_group_id
);

alter table public.role_group_app_roles enable row level security;

create trigger tr_role_group_app_roles__set_updated_at before
update on public.role_group_app_roles for each row
execute function public.util__set_updated_at ();
create table public.user_app_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  app public.app_type not null,
  role public.role_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_app_roles__workspace_user_app unique (workspace_id, user_id, app)
);

create index idx_user_app_roles__workspace_id on public.user_app_roles (workspace_id);

create index idx_user_app_roles__user_id_workspace_id on public.user_app_roles (
  user_id,
  workspace_id
);

alter table public.user_app_roles enable row level security;

create trigger tr_user_app_roles__set_updated_at before
update on public.user_app_roles for each row
execute function public.util__set_updated_at ();
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

create trigger tr_user_groups__set_updated_at before
update on public.user_groups for each row
execute function public.util__set_updated_at ();
create table public.user_group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_group_id uuid not null references public.user_groups (id) on update cascade on delete cascade,
  user_id uuid not null references auth.users (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_group_memberships__group_user unique (user_group_id, user_id)
);

create index idx_user_group_memberships__user_id on public.user_group_memberships (user_id);

create index idx_user_group_memberships__user_group_id on public.user_group_memberships (
  user_group_id
);

alter table public.user_group_memberships enable row level security;

/**
 * When a workspace membership is removed, drop user_group_memberships rows for
 * user groups in that workspace so tags do not outlive membership.
 */
create or replace function public.user_group_memberships__cleanup_on_workspace_member_removed ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_group_memberships ugm using public.user_groups ug
  where
    ugm.user_group_id = ug.id and
    ug.workspace_id = old.workspace_id and
    ugm.user_id = old.user_id;
  return old;
end;
$$;

create trigger tr_workspace_memberships__cleanup_user_group_memberships after delete on public.workspace_memberships for each row
execute function public.user_group_memberships__cleanup_on_workspace_member_removed ();
create table public.resource_user_group_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  resource_type public.resource_type not null,
  resource_id uuid not null,
  user_group_id uuid not null references public.user_groups (id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  constraint resource_user_group_tags__resource_tag unique (
    workspace_id,
    resource_type,
    resource_id,
    user_group_id
  )
);

create index idx_resource_user_group_tags__resource on public.resource_user_group_tags (
  resource_type,
  resource_id
);

alter table public.resource_user_group_tags enable row level security;
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
) where principal_type = 'workspace'::public.share_principal_type;

create unique index resource_shares__uniq_user_principal on public.resource_shares (
  resource_type,
  resource_id,
  principal_type,
  principal_id
) where principal_type = 'user'::public.share_principal_type;

create unique index resource_shares__uniq_user_group_principal on public.resource_shares (
  resource_type,
  resource_id,
  principal_type,
  principal_id
) where principal_type = 'user_group'::public.share_principal_type;

create index idx_resource_shares__resource on public.resource_shares (
  resource_type,
  resource_id
);

alter table public.resource_shares enable row level security;

create trigger tr_resource_shares__set_updated_at before
update on public.resource_shares for each row
execute function public.util__set_updated_at ();

alter table public.dashboards
  add column if not exists is_restricted boolean not null default false;

alter table public.datasets
  add column if not exists is_restricted boolean not null default false;

/**
 * Rank ordering for role_level (viewer < editor < admin).
 *
 * @returns Integer rank 1–3.
 */
create or replace function public.util__role_level_rank (
  p_role public.role_level
) returns int
language sql
immutable
as $$
  select case p_role
    when 'viewer'::public.role_level then 1
    when 'editor'::public.role_level then 2
    when 'admin'::public.role_level then 3
  end;
$$;

/**
 * Maps a rank back to role_level for aggregate results.
 *
 * @returns Matching role_level or null when rank is zero.
 */
create or replace function public.util__rank_to_role_level (
  p_rank int
) returns public.role_level
language sql
immutable
as $$
  select case p_rank
    when 1 then 'viewer'::public.role_level
    when 2 then 'editor'::public.role_level
    when 3 then 'admin'::public.role_level
    else null::public.role_level
  end;
$$;

/**
 * Whether the auth user is a Settings admin (Global admin) in the workspace.
 *
 * @returns True when settings app role is admin.
 */
create or replace function public.util__is_settings_admin (
  p_workspace_id uuid
) returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_app_roles uar
    where
      uar.workspace_id = p_workspace_id and
      uar.user_id = auth.uid () and
      uar.app = 'settings'::public.app_type and
      uar.role = 'admin'::public.role_level
  );
$$;

/**
 * Auth user's role for one app in a workspace.
 *
 * @returns Role level when present.
 */
create or replace function public.util__get_auth_user_app_role (
  p_workspace_id uuid,
  p_app public.app_type
) returns public.role_level
language sql
security definer
stable
set search_path = public
as $$
  select uar.role
  from public.user_app_roles uar
  where
    uar.workspace_id = p_workspace_id and
    uar.user_id = auth.uid () and
    uar.app = p_app
  limit 1;
$$;

/**
 * Distinct user_group ids the auth user belongs to in this workspace.
 *
 * @returns Array of user_group ids (possibly empty).
 */
create or replace function public.util__get_auth_user_user_group_ids (
  p_workspace_id uuid
) returns uuid[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    array_agg(distinct ugm.user_group_id),
    '{}'::uuid[]
  )
  from public.user_group_memberships ugm
  inner join public.user_groups ug on ug.id = ugm.user_group_id
  where ugm.user_id = auth.uid () and ug.workspace_id = p_workspace_id;
$$;

/**
 * Effective role for auth.uid() on a dashboard or dataset row.
 *
 * @returns Highest role_level from owner/settings shortcuts, shares, and
 *   tag-gated app roles when applicable.
 */
create or replace function public.util__resource_effective_role (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns public.role_level
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
  v_app public.app_type;
  v_uid uuid := auth.uid ();
  v_max_rank int := 0;
  v_share_rank int;
  v_user_app_role public.role_level;
  v_tag_count int;
  v_has_overlap boolean;
begin
  if v_uid is null then
    return null;
  end if;

  if p_resource_type = 'dashboard'::public.resource_type then
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards'::public.app_type;
  elsif p_resource_type = 'dataset'::public.resource_type then
    select
      ds.workspace_id,
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources'::public.app_type;
  else
    return null;
  end if;

  if v_workspace_id is null then
    return null;
  end if;

  if v_owner_id = v_uid then
    return 'admin'::public.role_level;
  end if;

  if public.util__is_settings_admin (v_workspace_id) then
    return 'admin'::public.role_level;
  end if;

  select coalesce(max(public.util__role_level_rank (rs.role)), 0)
  into v_share_rank
  from public.resource_shares rs
  where
    rs.workspace_id = v_workspace_id and
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    (
      (
        rs.principal_type = 'user'::public.share_principal_type and
        rs.principal_id = v_uid
      ) or
      (
        rs.principal_type = 'workspace'::public.share_principal_type and
        rs.principal_id is null
      ) or
      (
        rs.principal_type = 'user_group'::public.share_principal_type and
        rs.principal_id is not null and
        exists (
          select 1
          from public.user_group_memberships ugm
          where
            ugm.user_group_id = rs.principal_id and
            ugm.user_id = v_uid
        )
      )
    );

  v_max_rank := greatest(v_max_rank, coalesce(v_share_rank, 0));

  if not v_is_restricted then
    select public.util__get_auth_user_app_role (v_workspace_id, v_app)
    into v_user_app_role;

    if v_user_app_role is not null then
      select count(*) into v_tag_count
      from public.resource_user_group_tags rut
      where
        rut.workspace_id = v_workspace_id and
        rut.resource_type = p_resource_type and
        rut.resource_id = p_resource_id;

      if v_tag_count = 0 then
        v_max_rank := greatest(
          v_max_rank,
          public.util__role_level_rank (v_user_app_role)
        );
      else
        select exists (
          select 1
          from public.resource_user_group_tags rut
          inner join public.user_group_memberships ugm on
            ugm.user_group_id = rut.user_group_id
          where
            rut.workspace_id = v_workspace_id and
            rut.resource_type = p_resource_type and
            rut.resource_id = p_resource_id and
            ugm.user_id = v_uid
        )
        into v_has_overlap;

        if v_has_overlap then
          v_max_rank := greatest(
            v_max_rank,
            public.util__role_level_rank (v_user_app_role)
          );
        end if;
      end if;
    end if;
  end if;

  if v_max_rank = 0 then
    return null;
  end if;

  return public.util__rank_to_role_level (v_max_rank);
end;
$$;

/**
 * Whether the auth user meets at least the minimum role on a resource.
 *
 * @returns True when effective role is at least p_min_role.
 */
create or replace function public.util__auth_user_can_access_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_min_role public.role_level
) returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_eff public.role_level;
  v_eff_rank int;
  v_min_rank int;
begin
  v_eff := public.util__resource_effective_role (p_resource_type, p_resource_id);

  if v_eff is null then
    return false;
  end if;

  v_eff_rank := public.util__role_level_rank (v_eff);
  v_min_rank := public.util__role_level_rank (p_min_role);
  return v_eff_rank >= v_min_rank;
end;
$$;
------------------------------
-- Policies: user_app_roles
------------------------------
create policy "Members can SELECT user_app_roles in their workspaces" on public.user_app_roles for
select
  to authenticated using (
    public.user_app_roles.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT user_app_roles" on public.user_app_roles for insert to authenticated
with
  check (public.util__is_settings_admin (public.user_app_roles.workspace_id));

create policy "Settings admins can UPDATE user_app_roles" on public.user_app_roles
for update
  to authenticated using (public.util__is_settings_admin (public.user_app_roles.workspace_id))
with
  check (public.util__is_settings_admin (public.user_app_roles.workspace_id));

create policy "Settings admins can DELETE user_app_roles" on public.user_app_roles for delete to authenticated using (
  public.util__is_settings_admin (public.user_app_roles.workspace_id)
);

------------------------------
-- Policies: role_groups
------------------------------
create policy "Members can SELECT role_groups in their workspaces" on public.role_groups for
select
  to authenticated using (
    public.role_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT role_groups" on public.role_groups for insert to authenticated
with
  check (public.util__is_settings_admin (public.role_groups.workspace_id));

create policy "Settings admins can UPDATE role_groups" on public.role_groups
for update
  to authenticated using (public.util__is_settings_admin (public.role_groups.workspace_id))
with
  check (public.util__is_settings_admin (public.role_groups.workspace_id));

create policy "Settings admins can DELETE custom role_groups" on public.role_groups for delete to authenticated using (
  public.util__is_settings_admin (public.role_groups.workspace_id) and
  public.role_groups.is_builtin = false
);

------------------------------
-- Policies: role_group_app_roles
------------------------------
create policy "Members can SELECT role_group_app_roles" on public.role_group_app_roles for
select
  to authenticated using (
    exists (
      select 1
      from public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        rg.workspace_id = any (
          array(
            select
              public.util__get_auth_user_workspaces ()
          )
        )
    )
  );

create policy "Settings admins can INSERT role_group_app_roles" on public.role_group_app_roles for insert to authenticated
with
  check (
    exists (
      select 1
      from public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  );

create policy "Settings admins can UPDATE role_group_app_roles" on public.role_group_app_roles
for update
  to authenticated using (
    exists (
      select 1
      from public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  )
with
  check (
    exists (
      select 1
      from public.role_groups rg
      where
        rg.id = public.role_group_app_roles.role_group_id and
        public.util__is_settings_admin (rg.workspace_id)
    )
  );

create policy "Settings admins can DELETE role_group_app_roles" on public.role_group_app_roles for delete to authenticated using (
  exists (
    select 1
    from public.role_groups rg
    where
      rg.id = public.role_group_app_roles.role_group_id and
      public.util__is_settings_admin (rg.workspace_id)
  )
);

------------------------------
-- Policies: user_groups
------------------------------
create policy "Members can SELECT user_groups in their workspaces" on public.user_groups for
select
  to authenticated using (
    public.user_groups.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT user_groups" on public.user_groups for insert to authenticated
with
  check (public.util__is_settings_admin (public.user_groups.workspace_id));

create policy "Settings admins can UPDATE user_groups" on public.user_groups
for update
  to authenticated using (public.util__is_settings_admin (public.user_groups.workspace_id))
with
  check (public.util__is_settings_admin (public.user_groups.workspace_id));

create policy "Settings admins can DELETE user_groups" on public.user_groups for delete to authenticated using (
  public.util__is_settings_admin (public.user_groups.workspace_id)
);

------------------------------
-- Policies: user_group_memberships
------------------------------
create policy "Members can SELECT user_group_memberships" on public.user_group_memberships for
select
  to authenticated using (
    exists (
      select 1
      from public.user_groups ug
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

create policy "Settings admins can INSERT user_group_memberships" on public.user_group_memberships for insert to authenticated
with
  check (
    exists (
      select 1
      from public.user_groups ug
      where
        ug.id = public.user_group_memberships.user_group_id and
        public.util__is_settings_admin (ug.workspace_id)
    )
  );

create policy "Settings admins can DELETE user_group_memberships" on public.user_group_memberships for delete to authenticated using (
  exists (
    select 1
    from public.user_groups ug
    where
      ug.id = public.user_group_memberships.user_group_id and
      public.util__is_settings_admin (ug.workspace_id)
  )
);

------------------------------
-- Policies: resource_user_group_tags
------------------------------
create policy "Members can SELECT resource_user_group_tags" on public.resource_user_group_tags for
select
  to authenticated using (
    public.resource_user_group_tags.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT resource_user_group_tags" on public.resource_user_group_tags for insert to authenticated
with
  check (public.util__is_settings_admin (public.resource_user_group_tags.workspace_id));

create policy "Settings admins can UPDATE resource_user_group_tags" on public.resource_user_group_tags
for update
  to authenticated using (
    public.util__is_settings_admin (public.resource_user_group_tags.workspace_id)
  )
with
  check (public.util__is_settings_admin (public.resource_user_group_tags.workspace_id));

create policy "Settings admins can DELETE resource_user_group_tags" on public.resource_user_group_tags for delete to authenticated using (
  public.util__is_settings_admin (public.resource_user_group_tags.workspace_id)
);

------------------------------
-- Policies: resource_shares
------------------------------
create policy "Members can SELECT resource_shares in their workspaces" on public.resource_shares for
select
  to authenticated using (
    public.resource_shares.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT resource_shares" on public.resource_shares for insert to authenticated
with
  check (public.util__is_settings_admin (public.resource_shares.workspace_id));

create policy "Settings admins can UPDATE resource_shares" on public.resource_shares
for update
  to authenticated using (public.util__is_settings_admin (public.resource_shares.workspace_id))
with
  check (public.util__is_settings_admin (public.resource_shares.workspace_id));

create policy "Settings admins can DELETE resource_shares" on public.resource_shares for delete to authenticated using (
  public.util__is_settings_admin (public.resource_shares.workspace_id)
);
