drop policy "User can update dashboards" on "public"."dashboards";

drop policy "User can update datasets in their workspace" on "public"."datasets";


  create policy "User can update dashboards"
  on "public"."dashboards"
  as permissive
  for update
  to authenticated
using (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'viewer'::public.role_level)))
with check (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'viewer'::public.role_level) AND (owner_id = ANY (ARRAY( SELECT public.util__get_workspace_members(dashboards.workspace_id) AS util__get_workspace_members)))));



  create policy "User can update datasets in their workspace"
  on "public"."datasets"
  as permissive
  for update
  to authenticated
using (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'viewer'::public.role_level)))
with check (((public.util__can_manage_workspace_settings(workspace_id) OR (owner_id = ( SELECT auth.uid() AS uid))) AND public.util__auth_user_can_access_resource('dataset'::public.resource_type, id, 'viewer'::public.role_level) AND (owner_id = ANY (ARRAY( SELECT public.util__get_workspace_members(datasets.workspace_id) AS util__get_workspace_members)))));



