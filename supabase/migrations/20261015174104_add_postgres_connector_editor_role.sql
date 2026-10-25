drop policy "User can select db_connections in their workspace" on "public"."db_connections";

drop policy "User can select db_connections__postgres in their workspace" on "public"."db_connections__postgres";

  create policy "User can select db_connections in their workspace"
  on "public"."db_connections"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can select db_connections__postgres in their workspace"
  on "public"."db_connections__postgres"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



