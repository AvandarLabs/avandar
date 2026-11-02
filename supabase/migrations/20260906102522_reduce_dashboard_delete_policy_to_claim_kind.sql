drop policy "Users with admin access can delete dashboards" on "public"."dashboards";

  create policy "Users with admin access can delete dashboards"
  on "public"."dashboards"
  as permissive
  for delete
  to authenticated
using ((public.util__auth_user_can_delete_resource('dashboard'::public.resource_type, id) AND (snapshot_transition_kind = 'delete'::public.dashboard_snapshot_transition_kind)));



