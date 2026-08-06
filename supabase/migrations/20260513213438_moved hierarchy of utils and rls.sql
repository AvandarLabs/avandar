drop policy "
  User can DELETE dashboards in their workspace
" on "public"."dashboards";

drop policy "
  User can INSERT dashboards in their workspace
" on "public"."dashboards";

drop policy "
  User can SELECT dashboards in their workspace
" on "public"."dashboards";

drop policy "User can UPDATE dashboards in their workspace" on "public"."dashboards";

drop policy "Members can SELECT resource_shares in their workspaces" on "public"."resource_shares";

drop policy "Settings admins can DELETE resource_shares" on "public"."resource_shares";

drop policy "Settings admins can INSERT resource_shares" on "public"."resource_shares";

drop policy "Settings admins can UPDATE resource_shares" on "public"."resource_shares";

drop policy "Members can SELECT resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy "Settings admins can DELETE resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy "Settings admins can INSERT resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy "Settings admins can UPDATE resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy "Members can SELECT role_group_app_roles" on "public"."role_group_app_roles";

drop policy "Settings admins can DELETE role_group_app_roles" on "public"."role_group_app_roles";

drop policy "Settings admins can INSERT role_group_app_roles" on "public"."role_group_app_roles";

drop policy "Settings admins can UPDATE role_group_app_roles" on "public"."role_group_app_roles";

drop policy "Members can SELECT role_groups in their workspaces" on "public"."role_groups";

drop policy "Settings admins can DELETE custom role_groups" on "public"."role_groups";

drop policy "Settings admins can INSERT role_groups" on "public"."role_groups";

drop policy "Settings admins can UPDATE role_groups" on "public"."role_groups";

drop policy "
  User can SELECT their own subscriptions;
  User can SELECT s" on "public"."subscriptions";

drop policy "Members can SELECT user_group_memberships" on "public"."user_group_memberships";

drop policy "Settings admins can DELETE user_group_memberships" on "public"."user_group_memberships";

drop policy "Settings admins can INSERT user_group_memberships" on "public"."user_group_memberships";

drop policy "Members can SELECT user_groups in their workspaces" on "public"."user_groups";

drop policy "Settings admins can DELETE user_groups" on "public"."user_groups";

drop policy "Settings admins can INSERT user_groups" on "public"."user_groups";

drop policy "Settings admins can UPDATE user_groups" on "public"."user_groups";

drop policy "Users can SELECT profiles" on "public"."user_profiles";

drop policy "Admins can UPDATE user_roles" on "public"."user_roles";

drop policy "Users can INSERT user roles" on "public"."user_roles";

drop policy "Users can SELECT user roles" on "public"."user_roles";

drop policy "Settings admins can UPDATE workspace membership role group" on "public"."workspace_memberships";

drop policy "Users can DELETE workspace memberships" on "public"."workspace_memberships";

drop policy "Users can INSERT workspace memberships" on "public"."workspace_memberships";

drop policy "Users can SELECT workspace memberships" on "public"."workspace_memberships";

drop policy "
  User can DELETE workspaces they are an owner of
" on "public"."workspaces";

drop policy "
  User can UPDATE workspaces they admin
" on "public"."workspaces";

drop policy "Users can INSERT workspaces that they own" on "public"."workspaces";

drop policy "Users can SELECT workspaces they own or belong to" on "public"."workspaces";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.util__is_settings_admin(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_memberships wm
    inner join public.role_group_app_roles rgar on
      rgar.role_group_id = wm.role_group_id
    where
      wm.workspace_id = p_workspace_id and
      wm.user_id = auth.uid () and
      rgar.app = 'settings' and
      rgar.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.util__resource_effective_role(p_resource_type public.resource_type, p_resource_id uuid)
 RETURNS public.role_level
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
  v_app public.app_type;
  v_uid uuid := auth.uid ();
  v_max_rank int := 0;
  v_share_rank int;
  v_user_app_role public.role_level;
  v_tag_count int;
  v_has_overlap boolean;
begin
  if v_uid is null then
    return null;
  end if;

  if p_resource_type = 'dashboard' then
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select
      ds.workspace_id,
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources';
  else
    return null;
  end if;

  if v_workspace_id is null then
    return null;
  end if;

  if v_owner_id = v_uid then
    return 'admin';
  end if;

  if public.util__is_settings_admin (v_workspace_id) then
    return 'admin';
  end if;

  -- Shares and app-role grants never apply to users who are not workspace
  -- members (prevents workspace-wide or direct shares from opening rows to
  -- arbitrary authenticated users). Owner and settings-admin paths above
  -- already returned.
  if not exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = v_workspace_id and
      wm.user_id = v_uid
  ) then
    return null;
  end if;

  select coalesce(max(public.util__role_level_rank (rs.role)), 0)
  into v_share_rank
  from public.resource_shares rs
  where
    rs.workspace_id = v_workspace_id and
    rs.resource_type = p_resource_type and
    rs.resource_id = p_resource_id and
    (
      (
        rs.principal_type = 'user' and
        rs.principal_id = v_uid
      ) or
      (
        rs.principal_type = 'workspace' and
        rs.principal_id is null
      ) or
      (
        rs.principal_type = 'user_group' and
        rs.principal_id is not null and
        exists (
          select 1
          from public.user_group_memberships ugm
          inner join public.user_groups ug on ug.id = ugm.user_group_id
          where
            ugm.user_group_id = rs.principal_id and
            ugm.user_id = v_uid and
            ug.workspace_id = v_workspace_id
        )
      )
    );

  v_max_rank := greatest(v_max_rank, coalesce(v_share_rank, 0));

  if not v_is_restricted then
    select public.util__get_auth_user_app_role (v_workspace_id, v_app)
    into v_user_app_role;

    if v_user_app_role is not null then
      select count(*) into v_tag_count
      from public.resource_user_group_tags rut
      where
        rut.workspace_id = v_workspace_id and
        rut.resource_type = p_resource_type and
        rut.resource_id = p_resource_id;

      if v_tag_count = 0 then
        v_max_rank := greatest(
          v_max_rank,
          public.util__role_level_rank (v_user_app_role)
        );
      else
        select exists (
          select 1
          from public.resource_user_group_tags rut
          inner join public.user_group_memberships ugm on
            ugm.user_group_id = rut.user_group_id
          where
            rut.workspace_id = v_workspace_id and
            rut.resource_type = p_resource_type and
            rut.resource_id = p_resource_id and
            ugm.user_id = v_uid
        )
        into v_has_overlap;

        if v_has_overlap then
          v_max_rank := greatest(
            v_max_rank,
            public.util__role_level_rank (v_user_app_role)
          );
        end if;
      end if;
    end if;
  end if;

  if v_max_rank = 0 then
    return null;
  end if;

  return public.util__rank_to_role_level (v_max_rank);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__role_level_rank(p_role public.role_level)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case p_role
    when 'viewer' then 1
    when 'editor' then 2
    when 'admin' then 3
  end;
$function$
;


  create policy "User can delete dashboards"
  on "public"."dashboards"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level));



  create policy "User can insert dashboards"
  on "public"."dashboards"
  as permissive
  for insert
  to authenticated
with check ((public.util__auth_user_meets_min_app_role(workspace_id, 'dashboards'::public.app_type, 'editor'::public.role_level) AND (owner_id = ( SELECT auth.uid() AS uid))));



  create policy "User can read dashboards"
  on "public"."dashboards"
  as permissive
  for select
  to authenticated, anon
using (((is_public = true) OR ((auth.uid() IS NOT NULL) AND public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'viewer'::public.role_level))));



  create policy "User can update dashboards"
  on "public"."dashboards"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level))
with check (public.util__auth_user_can_access_resource('dashboard'::public.resource_type, id, 'editor'::public.role_level));



  create policy "Members can select resource_shares in their workspaces"
  on "public"."resource_shares"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can delete resource_shares"
  on "public"."resource_shares"
  as permissive
  for delete
  to authenticated
using (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can insert resource_shares"
  on "public"."resource_shares"
  as permissive
  for insert
  to authenticated
with check (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can update resource_shares"
  on "public"."resource_shares"
  as permissive
  for update
  to authenticated
using (public.util__is_settings_admin(workspace_id))
with check (public.util__is_settings_admin(workspace_id));



  create policy "Members can select resource_user_group_tags"
  on "public"."resource_user_group_tags"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can delete resource_user_group_tags"
  on "public"."resource_user_group_tags"
  as permissive
  for delete
  to authenticated
using (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can insert resource_user_group_tags"
  on "public"."resource_user_group_tags"
  as permissive
  for insert
  to authenticated
with check (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can update resource_user_group_tags"
  on "public"."resource_user_group_tags"
  as permissive
  for update
  to authenticated
using (public.util__is_settings_admin(workspace_id))
with check (public.util__is_settings_admin(workspace_id));



  create policy "Members can select role_group_app_roles"
  on "public"."role_group_app_roles"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = role_group_app_roles.role_group_id) AND (rg.workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))))));



  create policy "Settings admins can delete role_group_app_roles"
  on "public"."role_group_app_roles"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = role_group_app_roles.role_group_id) AND public.util__is_settings_admin(rg.workspace_id)))));



  create policy "Settings admins can insert role_group_app_roles"
  on "public"."role_group_app_roles"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = role_group_app_roles.role_group_id) AND public.util__is_settings_admin(rg.workspace_id)))));



  create policy "Settings admins can update role_group_app_roles"
  on "public"."role_group_app_roles"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = role_group_app_roles.role_group_id) AND public.util__is_settings_admin(rg.workspace_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = role_group_app_roles.role_group_id) AND public.util__is_settings_admin(rg.workspace_id)))));



  create policy "Members can select role_groups in their workspaces"
  on "public"."role_groups"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can delete custom role_groups"
  on "public"."role_groups"
  as permissive
  for delete
  to authenticated
using ((public.util__is_settings_admin(workspace_id) AND (is_builtin = false)));



  create policy "Settings admins can insert role_groups"
  on "public"."role_groups"
  as permissive
  for insert
  to authenticated
with check (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can update role_groups"
  on "public"."role_groups"
  as permissive
  for update
  to authenticated
using (public.util__is_settings_admin(workspace_id))
with check (public.util__is_settings_admin(workspace_id));



  create policy "User can select subscriptions they own or for their workspace"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using (((subscription_owner_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))));



  create policy "Members can select user_group_memberships"
  on "public"."user_group_memberships"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_groups ug
  WHERE ((ug.id = user_group_memberships.user_group_id) AND (ug.workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces)))))));



  create policy "Settings admins can delete user_group_memberships"
  on "public"."user_group_memberships"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_groups ug
  WHERE ((ug.id = user_group_memberships.user_group_id) AND public.util__is_settings_admin(ug.workspace_id)))));



  create policy "Settings admins can insert user_group_memberships"
  on "public"."user_group_memberships"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.user_groups ug
  WHERE ((ug.id = user_group_memberships.user_group_id) AND public.util__is_settings_admin(ug.workspace_id)))));



  create policy "Members can select user_groups in their workspaces"
  on "public"."user_groups"
  as permissive
  for select
  to authenticated
using ((workspace_id = ANY (ARRAY( SELECT public.util__get_auth_user_workspaces() AS util__get_auth_user_workspaces))));



  create policy "Settings admins can delete user_groups"
  on "public"."user_groups"
  as permissive
  for delete
  to authenticated
using (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can insert user_groups"
  on "public"."user_groups"
  as permissive
  for insert
  to authenticated
with check (public.util__is_settings_admin(workspace_id));



  create policy "Settings admins can update user_groups"
  on "public"."user_groups"
  as permissive
  for update
  to authenticated
using (public.util__is_settings_admin(workspace_id))
with check (public.util__is_settings_admin(workspace_id));



  create policy "Users can select profiles"
  on "public"."user_profiles"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "Admins can update user roles in their workspaces"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(workspace_id));



  create policy "Users can insert user roles in their workspaces"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can select user roles in their workspaces"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "Settings admins can update workspace membership role group"
  on "public"."workspace_memberships"
  as permissive
  for update
  to authenticated
using (public.util__is_settings_admin(workspace_id))
with check ((public.util__is_settings_admin(workspace_id) AND (role_group_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.role_groups rg
  WHERE ((rg.id = workspace_memberships.role_group_id) AND (rg.workspace_id = workspace_memberships.workspace_id))))));



  create policy "Users can delete workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for delete
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can insert workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for insert
  to authenticated
with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (workspace_id = ANY (public.util__get_auth_user_owned_workspaces()))) OR public.util__can_manage_workspace_settings(workspace_id)));



  create policy "Users can select workspace memberships"
  on "public"."workspace_memberships"
  as permissive
  for select
  to authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR (workspace_id = ANY (public.util__get_auth_user_workspaces()))));



  create policy "User can DELETE workspaces they are an owner of"
  on "public"."workspaces"
  as permissive
  for delete
  to authenticated
using ((owner_id = ANY (public.util__get_auth_user_owned_workspaces())));



  create policy "User can UPDATE workspaces they admin"
  on "public"."workspaces"
  as permissive
  for update
  to authenticated
using (public.util__can_manage_workspace_settings(id))
with check ((owner_id = ANY (public.util__get_workspace_members(id))));



  create policy "Users can insert workspaces that they own"
  on "public"."workspaces"
  as permissive
  for insert
  to authenticated
with check ((owner_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can select workspaces they own or belong to"
  on "public"."workspaces"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR (id = ANY (public.util__get_auth_user_workspaces()))));



