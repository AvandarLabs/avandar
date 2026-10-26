drop policy "User can DELETE individuals in their workspace" on "public"."individuals";

drop policy "User can INSERT individuals in their workspace" on "public"."individuals";

drop policy "User can UPDATE individuals in their workspace" on "public"."individuals";

  create policy "User can DELETE individuals in their workspace"
  on "public"."individuals"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_records'::public.app_type, 'admin'::public.role_level));



  create policy "User can INSERT individuals in their workspace"
  on "public"."individuals"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level) OR public.util__auth_user_meets_min_app_role(workspace_id, 'case_records'::public.app_type, 'editor'::public.role_level)));



  create policy "User can UPDATE individuals in their workspace"
  on "public"."individuals"
  as permissive
  for update
  to authenticated
using ((public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level) OR public.util__auth_user_meets_min_app_role(workspace_id, 'case_records'::public.app_type, 'editor'::public.role_level)))
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level) OR public.util__auth_user_meets_min_app_role(workspace_id, 'case_records'::public.app_type, 'editor'::public.role_level)));



