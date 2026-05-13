-- Resolve per-app roles from workspace_memberships.role_group_id +
-- role_group_app_roles; drop materialized user_app_roles.
create or replace function public.util__seed_builtin_role_groups_for_workspace (
  p_workspace_id uuid
) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  insert into
    public.role_groups (
      workspace_id,
      name,
      is_builtin
    )
  select
    p_workspace_id,
    v.name,
    true
  from
    (
      values
        ('Global Admin'),
        ('Global Editor'),
        ('Global Viewer')
    ) as v (name)
  on conflict (
    workspace_id,
    name
  ) do nothing;

  insert into
    public.role_group_app_roles (
      role_group_id,
      app,
      role
    )
  select
    rg.id,
    a.app,
    a.role
  from
    public.role_groups rg
    cross join lateral (
      values
        (
          'data_sources'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'data_explorer'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'dashboards'::public.app_type,
          'admin'::public.role_level
        ),
        (
          'settings'::public.app_type,
          'admin'::public.role_level
        )
    ) as a (
      app,
      role
    )
  where
    rg.workspace_id = p_workspace_id and
    rg.is_builtin and
    rg.name = 'Global Admin'
  on conflict (
    role_group_id,
    app
  ) do nothing;

  insert into
    public.role_group_app_roles (
      role_group_id,
      app,
      role
    )
  select
    rg.id,
    a.app,
    a.role
  from
    public.role_groups rg
    cross join lateral (
      values
        (
          'data_sources'::public.app_type,
          'editor'::public.role_level
        ),
        (
          'data_explorer'::public.app_type,
          'editor'::public.role_level
        ),
        (
          'dashboards'::public.app_type,
          'editor'::public.role_level
        )
    ) as a (
      app,
      role
    )
  where
    rg.workspace_id = p_workspace_id and
    rg.is_builtin and
    rg.name = 'Global Editor'
  on conflict (
    role_group_id,
    app
  ) do nothing;

  insert into
    public.role_group_app_roles (
      role_group_id,
      app,
      role
    )
  select
    rg.id,
    a.app,
    a.role
  from
    public.role_groups rg
    cross join lateral (
      values
        (
          'data_sources'::public.app_type,
          'viewer'::public.role_level
        ),
        (
          'data_explorer'::public.app_type,
          'viewer'::public.role_level
        ),
        (
          'dashboards'::public.app_type,
          'viewer'::public.role_level
        )
    ) as a (
      app,
      role
    )
  where
    rg.workspace_id = p_workspace_id and
    rg.is_builtin and
    rg.name = 'Global Viewer'
  on conflict (
    role_group_id,
    app
  ) do nothing;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select
      id
    from
      public.workspaces
  loop
    perform public.util__seed_builtin_role_groups_for_workspace (r.id);
  end loop;
end;
$$;

alter table public.workspace_memberships
add column if not exists role_group_id uuid references public.role_groups (id) on update cascade on delete restrict;

create index if not exists idx_workspace_memberships__role_group_id on public.workspace_memberships (
  role_group_id
);

update public.workspace_memberships wm
set
  role_group_id = (
    select
      rg.id
    from
      public.user_roles ur
      inner join public.role_groups rg on rg.workspace_id = wm.workspace_id and
      rg.name = case ur.role
        when 'admin' then 'Global Admin'
        else 'Global Viewer'
      end
    where
      ur.membership_id = wm.id
    limit
      1
  );

update public.workspace_memberships wm
set
  role_group_id = rg.id
from
  public.role_groups rg
where
  wm.role_group_id is null and
  rg.workspace_id = wm.workspace_id and
  rg.name = 'Global Viewer' and
  rg.is_builtin;

drop trigger if exists tr_workspaces__seed_builtin_role_groups on public.workspaces;

create or replace function public.tr_workspaces__seed_builtin_role_groups () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  perform public.util__seed_builtin_role_groups_for_workspace (new.id);
  return new;
end;
$$;

create trigger tr_workspaces__seed_builtin_role_groups
after insert on public.workspaces for each row
execute function public.tr_workspaces__seed_builtin_role_groups ();

create or replace function public.util__is_settings_admin (
  p_workspace_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    inner join public.role_group_app_roles rgar on
      rgar.role_group_id = wm.role_group_id
    where
      wm.workspace_id = p_workspace_id and
      wm.user_id = auth.uid () and
      rgar.app = 'settings'::public.app_type and
      rgar.role = 'admin'::public.role_level
  );
$$;

create or replace function public.util__get_auth_user_app_role (
  p_workspace_id uuid,
  p_app public.app_type
) returns public.role_level language sql security definer stable
set
  search_path = public as $$
  select rgar.role
  from public.workspace_memberships wm
  inner join public.role_group_app_roles rgar on
    rgar.role_group_id = wm.role_group_id
  where
    wm.workspace_id = p_workspace_id and
    wm.user_id = auth.uid () and
    rgar.app = p_app
  limit 1;
$$;

drop policy if exists "Members can SELECT user_app_roles in their workspaces" on public.user_app_roles;

drop policy if exists "Settings admins can INSERT user_app_roles" on public.user_app_roles;

drop policy if exists "Settings admins can UPDATE user_app_roles" on public.user_app_roles;

drop policy if exists "Settings admins can DELETE user_app_roles" on public.user_app_roles;

drop table if exists public.user_app_roles;

drop policy if exists "Settings admins can UPDATE workspace membership role group" on public.workspace_memberships;

create policy "Settings admins can UPDATE workspace membership role group" on public.workspace_memberships
for update
  to authenticated using (
    public.util__is_settings_admin (
      public.workspace_memberships.workspace_id
    )
  )
with
  check (
    public.util__is_settings_admin (
      public.workspace_memberships.workspace_id
    ) and
    public.workspace_memberships.role_group_id is not null and
    exists (
      select
        1
      from
        public.role_groups rg
      where
        rg.id = public.workspace_memberships.role_group_id and
        rg.workspace_id = public.workspace_memberships.workspace_id
    )
  );

create or replace function public.rpc_workspaces__create_with_owner (
  p_workspace_name text,
  p_workspace_slug text,
  p_full_name text,
  p_display_name text
) returns public.workspaces as $$
declare
  v_owner_id uuid := auth.uid();
  v_workspace public.workspaces;
  v_membership_id uuid;
begin
  insert into public.workspaces (
    owner_id,
    name,
    slug
  ) values (
    v_owner_id,
    p_workspace_name,
    p_workspace_slug
  ) returning * into v_workspace;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role_group_id
  )
  select
    v_workspace.id,
    v_owner_id,
    rg.id
  from
    public.role_groups rg
  where
    rg.workspace_id = v_workspace.id and
    rg.name = 'Global Admin' and
    rg.is_builtin
  returning id into v_membership_id;

  insert into public.user_profiles (
    workspace_id,
    user_id,
    membership_id,
    full_name,
    display_name
  ) values (
    v_workspace.id,
    v_owner_id,
    v_membership_id,
    p_full_name,
    p_display_name
  );

  insert into public.user_roles (
    workspace_id,
    user_id,
    membership_id,
    role
  ) values (
    v_workspace.id,
    v_owner_id,
    v_membership_id,
    'admin'
  );

  return v_workspace;
end;
$$ language plpgsql security invoker;
