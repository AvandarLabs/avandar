/**
 * Lists every dataset and dashboard the auth user can access only via shares
 * in a workspace (i.e. they have no app role on the resource's parent app).
 *
 * Owners and settings admins always have an effective role on their resources,
 * but if they also lack the parent app role they would still see those rows
 * here. By gating on `util__get_auth_user_app_role(...) is null`, rows the
 * user could find via the main app listing are excluded.
 *
 * @returns Rows of (resource_type, resource_id, name, effective_role).
 */
create or replace function public.rpc__list_shared_with_me (
  p_workspace_id uuid
) returns table (
  resource_type public.resource_type,
  resource_id uuid,
  name text,
  effective_role public.role_level
) language plpgsql security definer stable
set
  search_path = public as $$
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
$$;
