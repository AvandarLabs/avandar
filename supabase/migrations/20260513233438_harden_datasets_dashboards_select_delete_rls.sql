drop policy "User can read dashboards" on "public"."dashboards";

drop policy "User can delete dashboards" on "public"."dashboards";

drop policy "User can delete datasets in their workspace" on "public"."datasets";

drop policy "User can select datasets in their workspace" on "public"."datasets";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__auth_user_may_select_dashboard(p_dashboard_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_public boolean;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    d.workspace_id,
    d.owner_id,
    coalesce(d.is_restricted, false),
    coalesce(d.is_public, false)
  into v_ws, v_owner, v_restricted, v_public
  from
    public.dashboards d
  where
    d.id = p_dashboard_id;

  if v_ws is null then
    return false;
  end if;

  if v_public then
    return true;
  end if;

  if not (
    v_ws = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  if not public.util__auth_user_can_access_resource (
    'dashboard'::public.resource_type,
    p_dashboard_id,
    'viewer'::public.role_level
  ) then
    return false;
  end if;

  if public.util__can_manage_workspace_settings (v_ws) then
    return true;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  if v_restricted then
    return true;
  end if;

  v_app_role := public.util__get_auth_user_app_role (
    v_ws,
    'dashboards'::public.app_type
  );
  v_user_rank := coalesce(public.util__role_level_rank (v_app_role), 0);

  if v_user_rank < v_editor_rank then
    return true;
  end if;

  select exists (
    select
      1
    from
      public.resource_shares rs
    where
      rs.workspace_id = v_ws and
      rs.resource_type = 'dashboard'::public.resource_type and
      rs.resource_id = p_dashboard_id and
      (
        rs.principal_type = 'workspace'::public.share_principal_type or
        (
          rs.principal_type = 'user'::public.share_principal_type and
          rs.principal_id = v_uid
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select
              1
            from
              public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = v_uid
          )
        )
      )
  )
  into v_has_share;

  if v_has_share then
    return true;
  end if;

  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_may_select_dataset(p_dataset_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    ds.workspace_id,
    ds.owner_id,
    coalesce(ds.is_restricted, false)
  into v_ws, v_owner, v_restricted
  from
    public.datasets ds
  where
    ds.id = p_dataset_id;

  if v_ws is null then
    return false;
  end if;

  if not (
    v_ws = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  if not public.util__auth_user_can_access_resource (
    'dataset'::public.resource_type,
    p_dataset_id,
    'viewer'::public.role_level
  ) then
    return false;
  end if;

  if public.util__can_manage_workspace_settings (v_ws) then
    return true;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  if v_restricted then
    return true;
  end if;

  v_app_role := public.util__get_auth_user_app_role (
    v_ws,
    'data_sources'::public.app_type
  );
  v_user_rank := coalesce(public.util__role_level_rank (v_app_role), 0);

  if v_user_rank < v_editor_rank then
    return true;
  end if;

  select exists (
    select
      1
    from
      public.resource_shares rs
    where
      rs.workspace_id = v_ws and
      rs.resource_type = 'dataset'::public.resource_type and
      rs.resource_id = p_dataset_id and
      (
        rs.principal_type = 'workspace'::public.share_principal_type or
        (
          rs.principal_type = 'user'::public.share_principal_type and
          rs.principal_id = v_uid
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select
              1
            from
              public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = v_uid
          )
        )
      )
  )
  into v_has_share;

  if v_has_share then
    return true;
  end if;

  return false;
end;
$function$
;


  create policy "Anon can read public dashboards"
  on "public"."dashboards"
  as permissive
  for select
  to anon
using ((is_public = true));



  create policy "Authenticated can read dashboards"
  on "public"."dashboards"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_may_select_dashboard(id));



  create policy "User can delete dashboards"
  on "public"."dashboards"
  as permissive
  for delete
  to authenticated
using (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'viewer'::public.role_level)));



  create policy "User can delete datasets in their workspace"
  on "public"."datasets"
  as permissive
  for delete
  to authenticated
using (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'viewer'::public.role_level)));



  create policy "User can select datasets in their workspace"
  on "public"."datasets"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_may_select_dataset(id));



