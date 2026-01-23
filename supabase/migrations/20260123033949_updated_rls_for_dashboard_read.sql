drop policy "
  User can SELECT dashboards in their workspace
" on "public"."dashboards";


  create policy "
  User can SELECT dashboards in their workspace
"
  on "public"."dashboards"
  as permissive
  for select
  to authenticated, anon
using (((is_public = true) OR ((auth.uid() IS NOT NULL) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))))));


drop policy "Anyone can SELECT published datasets" on "storage"."objects";

drop policy "Authenticated users can UPDATE published datasets" on "storage"."objects";

drop policy "Authenticated users can UPLOAD published datasets" on "storage"."objects";


