drop policy "User can insert dashboards" on "public"."dashboards";

drop policy "User can insert datasets in their workspace" on "public"."datasets";

drop policy "Workspace owners can insert datasets" on "public"."datasets";

drop policy "Workspace settings managers can insert datasets" on "public"."datasets";


  create policy "Workspace managers can insert dashboards"
  on "public"."dashboards"
  as permissive
  for insert
  to authenticated
with check ((public.util__can_manage_workspace_settings(workspace_id) AND (owner_id = ( SELECT auth.uid() AS uid))));



  create policy "Workspace managers can insert datasets"
  on "public"."datasets"
  as permissive
  for insert
  to authenticated
with check ((public.util__can_manage_workspace_settings(workspace_id) AND (owner_id = ( SELECT auth.uid() AS uid))));



