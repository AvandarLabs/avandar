-- Backfill user_app_roles from legacy user_roles and seed built-in role groups.
insert into
  public.user_app_roles (
    workspace_id,
    user_id,
    app,
    role
  )
select
  ur.workspace_id,
  ur.user_id,
  x.app,
  x.role
from
  public.user_roles ur
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
  ) as x (
    app,
    role
  )
where
  ur.role = 'admin'
on conflict (
  workspace_id,
  user_id,
  app
) do nothing;

insert into
  public.user_app_roles (
    workspace_id,
    user_id,
    app,
    role
  )
select
  ur.workspace_id,
  ur.user_id,
  x.app,
  x.role
from
  public.user_roles ur
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
  ) as x (
    app,
    role
  )
where
  ur.role = 'member'
on conflict (
  workspace_id,
  user_id,
  app
) do nothing;

insert into
  public.role_groups (
    workspace_id,
    name,
    is_builtin
  )
select
  w.id,
  v.name,
  true
from
  public.workspaces w
  cross join (
    values
      (
        'Global Admin'
      ),
      (
        'Global Editor'
      ),
      (
        'Global Viewer'
      )
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
  rg.is_builtin and
  rg.name = 'Global Viewer'
on conflict (
  role_group_id,
  app
) do nothing;
