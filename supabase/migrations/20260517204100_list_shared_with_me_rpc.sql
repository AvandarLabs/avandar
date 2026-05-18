set
  check_function_bodies = off;

create or replace function public.rpc__list_shared_with_me (
  p_workspace_id uuid
) returns table (
  resource_type public.resource_type,
  resource_id uuid,
  name text,
  effective_role public.role_level
) language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid ();
  v_ds_app_role public.role_level;
  v_dash_app_role public.role_level;
begin
  if v_uid is null then
    return;
  end if;

  v_ds_app_role := public.util__get_auth_user_app_role (
    p_workspace_id,
    'data_sources'::public.app_type
  );
  v_dash_app_role := public.util__get_auth_user_app_role (
    p_workspace_id,
    'dashboards'::public.app_type
  );

  return query
    select
      'dataset'::public.resource_type as resource_type,
      ds.id as resource_id,
      ds.name as name,
      public.util__resource_effective_role (
        'dataset'::public.resource_type,
        ds.id
      ) as effective_role
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      v_ds_app_role is null and
      public.util__resource_effective_role (
        'dataset'::public.resource_type,
        ds.id
      ) is not null
    union all
    select
      'dashboard'::public.resource_type as resource_type,
      d.id as resource_id,
      d.name as name,
      public.util__resource_effective_role (
        'dashboard'::public.resource_type,
        d.id
      ) as effective_role
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      v_dash_app_role is null and
      public.util__resource_effective_role (
        'dashboard'::public.resource_type,
        d.id
      ) is not null;
end;
$function$;
