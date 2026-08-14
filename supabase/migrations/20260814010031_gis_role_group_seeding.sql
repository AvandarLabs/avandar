CREATE OR REPLACE FUNCTION public.util__seed_builtin_role_groups_for_workspace(p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          'gis'::public.app_type,
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
        ),
        (
          'gis'::public.app_type,
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
        ),
        (
          'gis'::public.app_type,
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
$function$;
