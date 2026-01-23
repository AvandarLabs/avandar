drop policy "
  Owner can INSERT their own user profile in their own workspa" on "public"."user_profiles";

drop policy "
  User can DELETE their own user_profiles;
  Admin can DELETE " on "public"."user_profiles";

drop policy "
  User can SELECT their own profiles;
  User can SELECT profil" on "public"."user_profiles";

drop policy "
  User can UPDATE their own user_profiles;
  Admin can UPDATE " on "public"."user_profiles";

drop policy "
  Owner can INSERT their own user_roles in their own workspace" on "public"."user_roles";

drop policy "
  User can DELETE their own user_roles;
  Admin can DELETE oth" on "public"."user_roles";

drop policy "
  User can SELECT their own user_roles;
  User can SELECT role" on "public"."user_roles";

drop policy "Admin can UPDATE user_roles" on "public"."user_roles";

drop policy "
  Owner can INSERT themselves as workspace members of their ow" on "public"."workspace_memberships";

drop policy "
  User can DELETE their own memberships;
  Admin can DELETE an" on "public"."workspace_memberships";

drop policy "
  User can SELECT their own memberships;
  User can SELECT mem" on "public"."workspace_memberships";

drop policy "
  User can INSERT workspaces that they own
" on "public"."workspaces";

drop policy "
  User can SELECT workspaces they own or belong to
" on "public"."workspaces";

drop policy "
  User can DELETE workspaces they are an owner of
" on "public"."workspaces";

drop policy "
  User can UPDATE workspaces they admin
" on "public"."workspaces";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_owned_workspaces()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspaces.id
    from public.workspaces
    where public.workspaces.owner_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspace_memberships.workspace_id
    from public.workspace_memberships
    where public.workspace_memberships.user_id = auth.uid()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_auth_user_workspaces_by_role(role text)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
begin
  return array(
    select public.user_roles.workspace_id
    from public.user_roles
    where
      public.user_roles.user_id = auth.uid()
      and public.user_roles.role = $1
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__get_workspace_members(workspace_id uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
begin
  return array(
    select public.workspace_memberships.user_id
    from public.workspace_memberships
    where workspace_memberships.workspace_id = $1
  );
end;
$function$
;


  create policy "Users can DELETE profiles"
  on "public"."user_profiles"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can INSERT profiles"
  on "public"."user_profiles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can SELECT profiles"
  on "public"."user_profiles"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "Users can UPDATE profiles"
  on "public"."user_profiles"
  as permissive
  for update
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Admins can UPDATE user_roles"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using ((workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text))));



  create policy "Users can DELETE user roles"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can INSERT user roles"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can SELECT user roles"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "Users can DELETE workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can INSERT workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR (workspace_id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text)))));



  create policy "Users can SELECT workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "Users can INSERT workspaces that they own"
  on "public"."workspaces"
  as permissive
  for insert
  to authenticated
with check ((owner_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can SELECT workspaces they own or belong to"
  on "public"."workspaces"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR (id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "
  User can DELETE workspaces they are an owner of
"
  on "public"."workspaces"
  as permissive
  for delete
  to authenticated
using ((owner_id = ANY (public.util__get_auth_user_owned_workspaces())));



  create policy "
  User can UPDATE workspaces they admin
"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using ((id = ANY (public.util__get_auth_user_workspaces_by_role('admin'::text))))
with check ((owner_id = ANY (public.util__get_workspace_members(id))));



