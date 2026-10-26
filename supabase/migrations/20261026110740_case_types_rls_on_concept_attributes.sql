drop policy "
  User can DELETE concept_attributes
" on "public"."concept_attributes";

drop policy "
  User can INSERT concept_attributes
" on "public"."concept_attributes";

drop policy "
  User can UPDATE concept_attributes
" on "public"."concept_attributes";

  create policy "
  User can DELETE concept_attributes
"
  on "public"."concept_attributes"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can INSERT concept_attributes
"
  on "public"."concept_attributes"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can UPDATE concept_attributes
"
  on "public"."concept_attributes"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



