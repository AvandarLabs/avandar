drop policy "
  User can DELETE dashboards in their workspace
" on "public"."dashboards";

drop policy "
  User can INSERT dashboards in their workspace
" on "public"."dashboards";

drop policy "
  User can SELECT dashboards in their workspace
" on "public"."dashboards";

drop policy "User can UPDATE dashboards in their workspace" on "public"."dashboards";

drop policy "User can delete dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can insert dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can select dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can update dataset_columns in their workspace" on "public"."dataset_columns";

drop policy "User can delete datasets in their workspace" on "public"."datasets";

drop policy "User can insert datasets in their workspace" on "public"."datasets";

drop policy "User can select datasets in their workspace" on "public"."datasets";

drop policy "User can update datasets in their workspace" on "public"."datasets";

drop policy "User can delete datasets__csv_file in their workspace" on "public"."datasets__csv_file";

drop policy "User can insert datasets__csv_file in their workspace" on "public"."datasets__csv_file";

drop policy "User can select datasets__csv_file in their workspace" on "public"."datasets__csv_file";

drop policy "User can update datasets__csv_file in their workspace" on "public"."datasets__csv_file";

drop policy "User can delete datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

drop policy "User can insert datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

drop policy "User can select datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

drop policy "User can update datasets__google_sheets in their workspace" on "public"."datasets__google_sheets";

drop policy "User can delete datasets__open_data in their workspace" on "public"."datasets__open_data";

drop policy "User can insert datasets__open_data in their workspace" on "public"."datasets__open_data";

drop policy "User can select datasets__open_data in their workspace" on "public"."datasets__open_data";

drop policy "User can update datasets__open_data in their workspace" on "public"."datasets__open_data";

drop policy "User can delete datasets__virtual in their workspace" on "public"."datasets__virtual";

drop policy "User can insert datasets__virtual in their workspace" on "public"."datasets__virtual";

drop policy "User can select datasets__virtual in their workspace" on "public"."datasets__virtual";

drop policy "User can update datasets__virtual in their workspace" on "public"."datasets__virtual";

drop policy "User can delete datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can insert datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can select datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "User can update datasets__xlsx_file in their workspace" on "public"."datasets__xlsx_file";

drop policy "Users can DELETE profiles" on "public"."user_profiles";

drop policy "Users can INSERT profiles" on "public"."user_profiles";

drop policy "Users can UPDATE profiles" on "public"."user_profiles";

drop policy "Admins can UPDATE user_roles" on "public"."user_roles";

drop policy "Users can DELETE user roles" on "public"."user_roles";

drop policy "Users can INSERT user roles" on "public"."user_roles";

drop policy "Users can DELETE workspace memberships" on "public"."workspace_memberships";

drop policy "Users can INSERT workspace memberships" on "public"."workspace_memberships";

drop policy "
  User can UPDATE workspaces they admin
" on "public"."workspaces";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__auth_user_meets_min_app_role(p_workspace_id uuid, p_app public.app_type, p_min_role public.role_level)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid ();
  v_role public.role_level;
begin
  if v_uid is null then
    return false;
  end if;

  if exists (
    select 1
    from public.workspaces w
    where
      w.id = p_workspace_id and
      w.owner_id = v_uid
  ) then
    return true;
  end if;

  v_role := public.util__get_auth_user_app_role (p_workspace_id, p_app);

  if v_role is null then
    return false;
  end if;

  return public.util__role_level_rank (v_role) >=
    public.util__role_level_rank (p_min_role);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__can_manage_workspace_settings(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspaces w
    where
      w.id = p_workspace_id and
      w.owner_id = auth.uid ()
  )
  or public.util__is_settings_admin (p_workspace_id);
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_datasets__add_dataset(p_dataset_id uuid, p_workspace_id uuid, p_dataset_name text, p_dataset_description text, p_dataset_source_type public.datasets__source_type, p_columns public.dataset_column_input[])
 RETURNS public.datasets
 LANGUAGE plpgsql
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_dataset public.datasets;
  v_column public.dataset_column_input;
begin
  -- Ensure the workspace is one that the user admins
  if (
    not public.util__can_manage_workspace_settings (p_workspace_id)
  ) then
    raise exception 'The requesting user is not an admin of this workspace';
  end if;

  -- Get the owner profile id
  select public.user_profiles.id into v_owner_profile_id
  from public.user_profiles
  where
    public.user_profiles.user_id = v_owner_id
    and public.user_profiles.workspace_id = p_workspace_id;

  -- Create the dataset
  insert into public.datasets (
    id,
    owner_id,
    owner_profile_id,
    workspace_id,
    name,
    description,
    source_type
  ) values (
    p_dataset_id,
    v_owner_id,
    v_owner_profile_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    p_dataset_source_type
  ) returning * into v_dataset;

  foreach v_column in array p_columns loop
    if v_column.original_name is null then
      raise exception 'Column original name is required';
    end if;
    if v_column.name is null then
      raise exception 'Column name is required';
    end if;
    if v_column.data_type is null then
      raise exception 'Column data type is required';
    end if;
    if v_column.column_idx is null then
      raise exception 'Column index is required';
    end if;

    insert into public.dataset_columns (
      dataset_id,
      workspace_id,
      original_name,
      name,
      original_data_type,
      detected_data_type,
      data_type,
      description,
      column_idx
    ) values (
      v_dataset.id,
      p_workspace_id,
      v_column.original_name,
      v_column.name,
      v_column.original_data_type,
      v_column.detected_data_type,
      v_column.data_type,
      v_column.description,
      v_column.column_idx
    );
  end loop;
  return v_dataset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces_by_role(role text)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid ();
begin
  if v_uid is null then
    return '{}'::uuid[];
  end if;

  if role = 'admin' then
    return array(
      select distinct x.wid
      from (
        select w.id as wid
        from public.workspaces w
        where
          w.owner_id = v_uid
        union all
        select wm.workspace_id as wid
        from public.workspace_memberships wm
        where
          wm.user_id = v_uid and
          public.util__is_settings_admin (wm.workspace_id)
      ) as x
    );
  end if;

  if role = 'member' then
    return public.util__get_auth_user_workspaces ();
  end if;

  return '{}'::uuid[];
end;
$function$
;


  create policy "
  User can DELETE dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level));



  create policy "
  User can INSERT dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'dashboards'::public.app_type, 'editor'::public.role_level) AND (owner_id = ( SELECT auth.uid() AS uid))));



  create policy "
  User can SELECT dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for select
  to authenticated, anon
using (((is_public = true) OR ((auth.uid() IS NOT NULL) AND public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'viewer'::public.role_level))));



  create policy "User can UPDATE dashboards in their workspace"
  on "public"."dashboards"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level));



  create policy "User can delete dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update dataset_columns in their workspace"
  on "public"."dataset_columns"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete datasets in their workspace"
  on "public"."datasets"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'editor'::public.role_level));



  create policy "User can insert datasets in their workspace"
  on "public"."datasets"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level) AND (owner_id = ( SELECT auth.uid() AS uid))));



  create policy "User can select datasets in their workspace"
  on "public"."datasets"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'viewer'::public.role_level));



  create policy "User can update datasets in their workspace"
  on "public"."datasets"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'editor'::public.role_level))
with check ((public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'editor'::public.role_level) AND (owner_id = ANY (ARRAY( SELECT public.util__get_workspace_members(datasets.workspace_id) AS util__get_workspace_members)))));



  create policy "User can delete datasets__csv_file in their workspace"
  on "public"."datasets__csv_file"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert datasets__csv_file in their workspace"
  on "public"."datasets__csv_file"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__csv_file in their workspace"
  on "public"."datasets__csv_file"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__csv_file in their workspace"
  on "public"."datasets__csv_file"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__google_sheets in their workspace"
  on "public"."datasets__google_sheets"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete datasets__open_data in their workspace"
  on "public"."datasets__open_data"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert datasets__open_data in their workspace"
  on "public"."datasets__open_data"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__open_data in their workspace"
  on "public"."datasets__open_data"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__open_data in their workspace"
  on "public"."datasets__open_data"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete datasets__virtual in their workspace"
  on "public"."datasets__virtual"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert datasets__virtual in their workspace"
  on "public"."datasets__virtual"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__virtual in their workspace"
  on "public"."datasets__virtual"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__virtual in their workspace"
  on "public"."datasets__virtual"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can delete datasets__xlsx_file in their workspace"
  on "public"."datasets__xlsx_file"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can insert datasets__xlsx_file in their workspace"
  on "public"."datasets__xlsx_file"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "User can select datasets__xlsx_file in their workspace"
  on "public"."datasets__xlsx_file"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'viewer'::public.role_level));



  create policy "User can update datasets__xlsx_file in their workspace"
  on "public"."datasets__xlsx_file"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dataset'::public.resource_type, dataset_id, 'editor'::public.role_level));



  create policy "Users can DELETE profiles"
  on "public"."user_profiles"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can INSERT profiles"
  on "public"."user_profiles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can UPDATE profiles"
  on "public"."user_profiles"
  as permissive
  for update
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Admins can UPDATE user_roles"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id));



  create policy "Users can DELETE user roles"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can INSERT user roles"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can DELETE workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can INSERT workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "
  User can UPDATE workspaces they admin
"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(id))
with check ((owner_id = ANY (public.util__get_workspace_members(id))));



