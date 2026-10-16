drop policy "User can select connections in their workspace" on "public"."connections";

drop policy "User can select connections__postgres in their workspace" on "public"."connections__postgres";

  create policy "User can select connections in their workspace"
  on "public"."connections"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



  create policy "User can select connections__postgres in their workspace"
  on "public"."connections__postgres"
  as permissive
  for select
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'data_sources'::public.app_type, 'editor'::public.role_level));



