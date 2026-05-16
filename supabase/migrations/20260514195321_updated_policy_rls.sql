drop policy "
  Settings admins can DELETE any workspace invite
" on "public"."workspace_invites";

drop policy "
  Settings admins can SELECT workspace invites
" on "public"."workspace_invites";

drop policy "
  Settings admins can UPDATE any workspace invite
" on "public"."workspace_invites";

drop policy "
  User can SELECT invites they sent from their workspace
" on "public"."workspace_invites";

drop index if exists "public"."idx_workspace_invites__role_group_id";

alter table "public"."role_groups" add constraint "role_groups__custom_name_not_reserved_builtin" CHECK ((is_builtin OR (lower(btrim(name)) <> ALL (ARRAY['global admin'::text, 'global editor'::text, 'global viewer'::text])))) not valid;

alter table "public"."role_groups" validate constraint "role_groups__custom_name_not_reserved_builtin";


  create policy "Settings admins can delete any workspace invite"
  on "public"."workspace_invites"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.workspace_memberships wm
     JOIN public.role_group_app_roles rgar ON ((rgar.role_group_id = wm.role_group_id)))
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (rgar.app = 'settings'::public.app_type) AND (rgar.role = 'admin'::public.role_level)))));



  create policy "Settings admins can select workspace invites"
  on "public"."workspace_invites"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.workspace_memberships wm
     JOIN public.role_group_app_roles rgar ON ((rgar.role_group_id = wm.role_group_id)))
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (rgar.app = 'settings'::public.app_type) AND (rgar.role = 'admin'::public.role_level)))));



  create policy "Settings admins can update any workspace invite"
  on "public"."workspace_invites"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.workspace_memberships wm
     JOIN public.role_group_app_roles rgar ON ((rgar.role_group_id = wm.role_group_id)))
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (rgar.app = 'settings'::public.app_type) AND (rgar.role = 'admin'::public.role_level)))))
with check ((EXISTS ( SELECT 1
   FROM (public.workspace_memberships wm
     JOIN public.role_group_app_roles rgar ON ((rgar.role_group_id = wm.role_group_id)))
  WHERE ((wm.workspace_id = workspace_invites.workspace_id) AND (wm.user_id = auth.uid()) AND (rgar.app = 'settings'::public.app_type) AND (rgar.role = 'admin'::public.role_level)))));



  create policy "User can select invites they sent from their workspace"
  on "public"."workspace_invites"
  as permissive
  for select
  to authenticated
using (((invited_by = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



