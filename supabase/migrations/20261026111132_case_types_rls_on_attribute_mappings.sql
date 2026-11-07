drop policy "
  User can DELETE attribute_mappings__dataset_column
" on "public"."attribute_mappings__dataset_column";

drop policy "
  User can INSERT attribute_mappings__dataset_column
" on "public"."attribute_mappings__dataset_column";

drop policy "
  User can UPDATE attribute_mappings__dataset_column
" on "public"."attribute_mappings__dataset_column";

drop policy "
  User can DELETE attribute_mappings__manual_entry
" on "public"."attribute_mappings__manual_entry";

drop policy "
  User can INSERT attribute_mappings__manual_entry
" on "public"."attribute_mappings__manual_entry";

drop policy "
  User can UPDATE attribute_mappings__manual_entry
" on "public"."attribute_mappings__manual_entry";

  create policy "
  User can DELETE attribute_mappings__dataset_column
"
  on "public"."attribute_mappings__dataset_column"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can INSERT attribute_mappings__dataset_column
"
  on "public"."attribute_mappings__dataset_column"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can UPDATE attribute_mappings__dataset_column
"
  on "public"."attribute_mappings__dataset_column"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can DELETE attribute_mappings__manual_entry
"
  on "public"."attribute_mappings__manual_entry"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can INSERT attribute_mappings__manual_entry
"
  on "public"."attribute_mappings__manual_entry"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



  create policy "
  User can UPDATE attribute_mappings__manual_entry
"
  on "public"."attribute_mappings__manual_entry"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level))
with check (public.util__auth_user_meets_min_app_role(workspace_id, 'case_types'::public.app_type, 'editor'::public.role_level));



