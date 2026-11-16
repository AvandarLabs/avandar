drop policy "
  User can DELETE concepts
" on "public"."concepts";

drop policy "
  User can INSERT concepts
" on "public"."concepts";

drop policy "User can UPDATE concepts" on "public"."concepts";

  create policy "
  User can DELETE concepts
"
  on "public"."concepts"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'admin'::public.role_level));



  create policy "
  User can INSERT concepts
"
  on "public"."concepts"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "User can UPDATE concepts"
  on "public"."concepts"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



