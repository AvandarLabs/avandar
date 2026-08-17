drop function if exists "public"."rpc_workspaces__private_resource_counts"(p_workspace_id uuid);

  create table "public"."maps" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "owner_id" uuid not null default auth.uid(),
    "owner_profile_id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "is_public" boolean not null default false,
    "slug" text,
    "config" jsonb not null,
    "is_restricted" boolean not null default false
      );

alter table "public"."maps" enable row level security;

CREATE INDEX idx_maps__owner_id ON public.maps USING btree (owner_id);

CREATE INDEX idx_maps__owner_profile_id ON public.maps USING btree (owner_profile_id);

CREATE INDEX idx_maps__slug ON public.maps USING btree (slug);

CREATE INDEX idx_maps__workspace_owner ON public.maps USING btree (workspace_id, owner_id);

CREATE UNIQUE INDEX maps__slug_unique_when_public ON public.maps USING btree (slug) WHERE ((is_public = true) AND (slug IS NOT NULL));

CREATE UNIQUE INDEX maps_pkey ON public.maps USING btree (id);

alter table "public"."maps" add constraint "maps_pkey" PRIMARY KEY using index "maps_pkey";

alter table "public"."maps" add constraint "maps_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON UPDATE CASCADE not valid;

alter table "public"."maps" validate constraint "maps_owner_id_fkey";

alter table "public"."maps" add constraint "maps_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES public.user_profiles(id) ON UPDATE CASCADE not valid;

alter table "public"."maps" validate constraint "maps_owner_profile_id_fkey";

alter table "public"."maps" add constraint "maps_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."maps" validate constraint "maps_workspace_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.maps__auth_user_may_select(p_map_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
begin
  select m.workspace_id, m.owner_id, coalesce(m.is_restricted, false)
  into v_workspace_id, v_owner_id, v_is_restricted
  from public.maps m
  where m.id = p_map_id;

  if v_workspace_id is null or not public.util__auth_user_may_select_resource_base (
    'map'::public.resource_type, p_map_id, v_workspace_id
  ) then
    return false;
  end if;

  return public.maps__auth_user_may_select_grant (
    p_map_id, v_workspace_id, v_owner_id, v_is_restricted
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.maps__auth_user_may_select_grant(p_map_id uuid, p_workspace_id uuid, p_owner_id uuid, p_is_restricted boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_app_role public.role_level;
  v_has_share boolean;
begin
  if public.util__can_manage_workspace_settings (p_workspace_id) or
    p_owner_id = auth.uid () then
    return true;
  end if;

  v_has_share := public.util__auth_user_has_resource_share (
    'map'::public.resource_type, p_map_id, p_workspace_id,
    'gis'::public.app_type
  );
  if p_is_restricted then
    return coalesce(v_has_share, false);
  end if;

  v_app_role := public.util__get_auth_user_app_role (
    p_workspace_id, 'gis'::public.app_type
  );
  return coalesce(public.util__role_level_rank (v_app_role), 0) <
    public.util__role_level_rank ('editor'::public.role_level) or v_has_share;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.maps__owner_id_matches_stored(p_map_id uuid, p_owner_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    m.owner_id = p_owner_id and
    public.maps__auth_user_may_select (p_map_id) and
    public.util__auth_user_can_update_resource ('map', p_map_id)
  from public.maps m
  where m.id = p_map_id;
$function$
;

CREATE OR REPLACE FUNCTION public.maps__prevent_workspace_id_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'map workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.maps__validate_owner_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.user_profiles up
    where
      up.id = new.owner_profile_id and
      up.user_id = new.owner_id and
      up.workspace_id = new.workspace_id
  ) then
    raise exception 'map owner profile must match owner and workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_has_resource_share(p_resource_type public.resource_type, p_resource_id uuid, p_workspace_id uuid, p_app public.app_type)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.resource_shares rs
    where
      rs.workspace_id = p_workspace_id and
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      (
        rs.principal_type = 'workspace'::public.share_principal_type or
        (
          rs.principal_type = 'user'::public.share_principal_type and
          rs.principal_id = (select auth.uid ())
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select 1
            from public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = (select auth.uid ())
          ) and
          (
            rs.requires_app_access = false or
            public.util__get_auth_user_app_role (p_workspace_id, p_app) is not null
          )
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_may_select_resource_base(p_resource_type public.resource_type, p_resource_id uuid, p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    p_workspace_id = any (
      array(
        select public.util__get_auth_user_workspaces ()
      )
    ) and
    public.util__auth_user_can_access_resource (
      p_resource_type,
      p_resource_id,
      'viewer'::public.role_level
    );
$function$
;

CREATE OR REPLACE FUNCTION public.resource_shares__validate_resource_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_resource_workspace_id uuid;
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = new.resource_id;
  elsif new.resource_type = 'dataset'::public.resource_type then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = new.resource_id;
  elsif new.resource_type = 'map'::public.resource_type then
    select m.workspace_id into v_resource_workspace_id
    from public.maps m
    where m.id = new.resource_id;
  end if;

  if v_resource_workspace_id is distinct from new.workspace_id then
    raise exception 'resource share workspace must match the resource workspace'
      using errcode = '23514';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_resources__transfer_ownership(p_resource_type public.resource_type, p_resource_id uuid, p_new_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_workspace_id uuid;
  v_current_owner_id uuid;
  v_new_profile_id uuid;
  v_app public.app_type;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id, d.owner_id
    into v_workspace_id, v_current_owner_id
    from public.dashboards d
    where d.id = p_resource_id
    for update;
    v_app := 'dashboards';
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id, ds.owner_id
    into v_workspace_id, v_current_owner_id
    from public.datasets ds
    where ds.id = p_resource_id
    for update;
    v_app := 'data_sources';
  elsif p_resource_type = 'map' then
    select m.workspace_id, m.owner_id
    into v_workspace_id, v_current_owner_id
    from public.maps m
    where m.id = p_resource_id
    for update;
    v_app := 'gis';
  else
    raise exception 'unsupported resource type: %', p_resource_type;
  end if;

  -- A missing resource raises the SAME error as an unauthorised caller, on
  -- purpose. This function is security definer, so its lookup above spans every
  -- workspace, not just the caller's. Raising a distinct "not found" here would
  -- turn the function into an existence oracle: any authenticated user could
  -- probe arbitrary ids and learn from which error came back whether a resource
  -- exists anywhere in the system, all before any authorisation check runs.
  --
  -- Authorisation cannot simply be checked first, because the workspace to
  -- authorise against is only known after the lookup. Making the two cases
  -- indistinguishable is the fix. The cost is that an authorised admin passing
  -- a genuinely stale id also sees insufficient_privilege; that only happens on
  -- a delete race, and leaking existence to everyone is the worse trade.
  if
    v_workspace_id is null or
    not public.util__can_manage_workspace_settings (v_workspace_id)
  then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  -- A security definer function bypasses the resource UPDATE policy, which
  -- normally enforces that owner_id stays inside the workspace. Re-check here
  -- so this function cannot move a resource out of its workspace.
  if not exists (
    select 1
    from public.workspace_memberships wm
    where
      wm.workspace_id = v_workspace_id and
      wm.user_id = p_new_owner_id
  ) then
    raise exception 'new owner must be a member of the resource workspace';
  end if;

  -- Nothing to do, and nothing worth auditing.
  if v_current_owner_id = p_new_owner_id then
    return;
  end if;

  select up.id
  into v_new_profile_id
  from public.user_profiles up
  where
    up.user_id = p_new_owner_id and
    up.workspace_id = v_workspace_id;

  if v_new_profile_id is null then
    raise exception 'new owner has no user_profile in this workspace';
  end if;

  if p_resource_type = 'dashboard' then
    update public.dashboards
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    update public.datasets
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  else
    update public.maps
       set owner_id = p_new_owner_id,
           owner_profile_id = v_new_profile_id
     where id = p_resource_id;
  end if;

  insert into public.usage_analytics_events (
    workspace_id,
    user_id,
    event_name,
    app,
    payload
  )
  values (
    v_workspace_id,
    auth.uid (),
    'resource.ownership_transferred',
    v_app,
    jsonb_build_object(
      'resourceType', p_resource_type,
      'resourceId', p_resource_id,
      'previousOwnerId', v_current_owner_id,
      'newOwnerId', p_new_owner_id
    )
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__private_resource_counts(p_workspace_id uuid)
 RETURNS TABLE(user_id uuid, private_dashboard_count bigint, private_dataset_count bigint, private_map_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  return query
  with private_dashboards as (
    select d.owner_id, count(*) as resource_count
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.is_restricted and
      not d.is_public and
      not public.util__has_non_owner_share (
        'dashboard'::public.resource_type,
        d.id,
        d.workspace_id,
        d.owner_id
      )
    group by d.owner_id
  ),
  private_datasets as (
    select ds.owner_id, count(*) as resource_count
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.is_restricted and
      not public.util__has_non_owner_share (
        'dataset'::public.resource_type,
        ds.id,
        ds.workspace_id,
        ds.owner_id
      )
    group by ds.owner_id
  ),
  private_maps as (
    select m.owner_id, count(*) as resource_count
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.is_restricted and
      not public.util__has_non_owner_share (
        'map'::public.resource_type,
        m.id,
        m.workspace_id,
        m.owner_id
      )
    group by m.owner_id
  )
  select
    wm.user_id,
    coalesce(pd.resource_count, 0),
    coalesce(pds.resource_count, 0),
    coalesce(pm.resource_count, 0)
  from public.workspace_memberships wm
  left join private_dashboards pd on pd.owner_id = wm.user_id
  left join private_datasets pds on pds.owner_id = wm.user_id
  left join private_maps pm on pm.owner_id = wm.user_id
  where wm.workspace_id = p_workspace_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_workspaces__transfer_all_owned_resources(p_workspace_id uuid, p_from_user_id uuid, p_new_owner_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_moved integer := 0;
  v_resource_id uuid;
begin
  if not public.util__can_manage_workspace_settings (p_workspace_id) then
    raise exception 'insufficient_privilege'
      using errcode = '42501';
  end if;

  for v_resource_id in
    select d.id
    from public.dashboards d
    where
      d.workspace_id = p_workspace_id and
      d.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dashboard'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select ds.id
    from public.datasets ds
    where
      ds.workspace_id = p_workspace_id and
      ds.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'dataset'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  for v_resource_id in
    select m.id
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'map'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__auth_user_can_access_resource_in_workspace(p_resource_type public.resource_type, p_resource_id uuid, p_workspace_id uuid, p_required_role public.role_level)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_resource_workspace_id uuid;
begin
  if p_resource_type = 'dashboard' then
    select d.workspace_id into v_resource_workspace_id
    from public.dashboards d
    where d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select ds.workspace_id into v_resource_workspace_id
    from public.datasets ds
    where ds.id = p_resource_id;
  elsif p_resource_type = 'map' then
    select m.workspace_id into v_resource_workspace_id
    from public.maps m
    where m.id = p_resource_id;
  else
    return false;
  end if;

  return
    v_resource_workspace_id = p_workspace_id and
    public.util__auth_user_can_access_resource (
      p_resource_type,
      p_resource_id,
      p_required_role
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__is_resource_private_to_owner(p_resource_type public.resource_type, p_resource_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
  v_is_restricted boolean;
begin
  if p_resource_type = 'dashboard' then
    select
      d.owner_id,
      d.workspace_id,
      coalesce(d.is_restricted, false)
    into v_owner_id, v_workspace_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
  elsif p_resource_type = 'dataset' then
    select
      ds.owner_id,
      ds.workspace_id,
      coalesce(ds.is_restricted, false)
    into v_owner_id, v_workspace_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
  elsif p_resource_type = 'map' then
    select
      m.owner_id,
      m.workspace_id,
      coalesce(m.is_restricted, false)
    into v_owner_id, v_workspace_id, v_is_restricted
    from public.maps m
    where
      m.id = p_resource_id;
  else
    return false;
  end if;

  if v_owner_id is null then
    return false;
  end if;

  if not v_is_restricted then
    return false;
  end if;

  return not public.util__has_non_owner_share (
    p_resource_type,
    p_resource_id,
    v_workspace_id,
    v_owner_id
  );
end;
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
  v_is_public boolean := false;
  v_app public.app_type;
  v_uid uuid := auth.uid ();
  v_max_rank int := 0;
  v_share_rank int;
  v_user_app_role public.role_level;
begin
  if v_uid is null then
    return null;
  end if;

  if p_resource_type = 'dashboard' then
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false),
      coalesce(d.is_public, false)
    into v_workspace_id, v_owner_id, v_is_restricted, v_is_public
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
  elsif p_resource_type = 'map' then
    select
      m.workspace_id,
      m.owner_id,
      coalesce(m.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.maps m
    where
      m.id = p_resource_id;
    v_app := 'gis';
  else
    return null;
  end if;

  if v_workspace_id is null then
    return null;
  end if;

  if v_owner_id = v_uid then
    return 'admin';
  end if;

  -- Settings Admins are admin on everything in this workspace EXCEPT resources
  -- their owner has kept private (restricted, zero non-owner shares). Mirrors
  -- Google Drive: an org admin cannot read an employee's private document.
  --
  -- Public dashboards are never private however `is_restricted` is set, because
  -- the anon policy already exposes them; excluding them here keeps an admin's
  -- edit rights on a dashboard the whole internet can read.
  --
  -- Composed inline from values already in scope rather than calling
  -- util__is_resource_private_to_owner, which would re-fetch the row. RLS calls
  -- this function per row.
  if public.util__is_settings_admin (v_workspace_id) and (
    v_is_public or
    not (
      v_is_restricted and
      not public.util__has_non_owner_share (
        p_resource_type,
        p_resource_id,
        v_workspace_id,
        v_owner_id
      )
    )
  ) then
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
        ) and
        (
          rs.requires_app_access = false or
          public.util__get_auth_user_app_role (v_workspace_id, v_app) is not null
        )
      )
    );

  v_max_rank := greatest(v_max_rank, coalesce(v_share_rank, 0));

  if not v_is_restricted then
    select public.util__get_auth_user_app_role (v_workspace_id, v_app)
    into v_user_app_role;

    if v_user_app_role is not null then
      v_max_rank := greatest(
        v_max_rank,
        public.util__role_level_rank (v_user_app_role)
      );
    end if;
  end if;

  if v_max_rank = 0 then
    return null;
  end if;

  return public.util__rank_to_role_level (v_max_rank);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.util__resource_type_to_app_type(p_resource_type public.resource_type)
 RETURNS public.app_type
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_resource_type
    when 'dashboard'::public.resource_type then 'dashboards'::public.app_type
    when 'dataset'::public.resource_type then 'data_sources'::public.app_type
    when 'map'::public.resource_type then 'gis'::public.app_type
  end;
$function$
;

-- Default privileges still grant DML to anon on a newly created table.
-- Match `normalize_data_api_grants`: maps is authenticated-only, like datasets.
revoke delete on table "public"."maps" from "anon";

revoke insert on table "public"."maps" from "anon";

revoke select on table "public"."maps" from "anon";

revoke update on table "public"."maps" from "anon";

grant delete on table "public"."maps" to "authenticated";

grant insert on table "public"."maps" to "authenticated";

grant select on table "public"."maps" to "authenticated";

grant update on table "public"."maps" to "authenticated";

  create policy "Users can read maps they have permissions for"
  on "public"."maps"
  as permissive
  for select
  to authenticated
using (((owner_id = ( SELECT auth.uid() AS uid)) OR public.maps__auth_user_may_select(id)));

  create policy "Users with admin access can delete maps"
  on "public"."maps"
  as permissive
  for delete
  to authenticated
using (public.util__auth_user_can_delete_resource('map'::public.resource_type, id));

  create policy "Users with editor access can update maps"
  on "public"."maps"
  as permissive
  for update
  to authenticated
using (public.util__auth_user_can_update_resource('map'::public.resource_type, id))
with check ((public.util__auth_user_can_update_resource('map'::public.resource_type, id) AND public.maps__owner_id_matches_stored(id, owner_id) AND (owner_id = ANY (ARRAY( SELECT public.util__get_workspace_members(maps.workspace_id) AS util__get_workspace_members)))));

  create policy "Users with editor app role can insert maps"
  on "public"."maps"
  as permissive
  for insert
  to authenticated
with check (public.util__auth_user_can_insert_workspace_resource(workspace_id, 'map'::public.resource_type, owner_id));

CREATE TRIGGER tr__maps__prevent_workspace_id_change BEFORE UPDATE OF workspace_id ON public.maps FOR EACH ROW EXECUTE FUNCTION public.maps__prevent_workspace_id_change();

CREATE TRIGGER tr__maps__set_updated_at BEFORE UPDATE ON public.maps FOR EACH ROW EXECUTE FUNCTION public.util__set_updated_at();

CREATE TRIGGER tr__maps__validate_owner_profile BEFORE INSERT OR UPDATE OF owner_id, owner_profile_id, workspace_id ON public.maps FOR EACH ROW EXECUTE FUNCTION public.maps__validate_owner_profile();


-- `supabase db diff` does not emit privilege changes, and every function this
-- migration creates or recreates therefore lands with Postgres's default
-- `execute to public`. Re-apply the privileges declared in supabase/schemas/
-- so the security-definer helpers stay locked down. Without this block a
-- schema dump shows anon and service_role holding execute on the map
-- visibility helpers and on util__get_user_id_by_email.
revoke
execute on function public.rpc_workspaces__private_resource_counts (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__private_resource_counts (uuid) to authenticated;

revoke
execute on function public.rpc_workspaces__transfer_all_owned_resources (
  uuid,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_workspaces__transfer_all_owned_resources (
  uuid,
  uuid,
  uuid
) to authenticated;

revoke
execute on function public.rpc_resources__transfer_ownership (
  public.resource_type,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_resources__transfer_ownership (
  public.resource_type,
  uuid,
  uuid
) to authenticated;

revoke
execute on function public.util__auth_user_has_resource_share (
  public.resource_type,
  uuid,
  uuid,
  public.app_type
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.util__auth_user_may_select_resource_base (
  public.resource_type,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.maps__auth_user_may_select_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function public.maps__auth_user_may_select (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.maps__auth_user_may_select (uuid) to authenticated;

revoke
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
)
from
  public,
  anon,
  service_role;

grant
execute on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
) to authenticated;

revoke
execute on function public.maps__validate_owner_profile ()
from
  public,
  anon,
  authenticated,
  service_role;

revoke all on function public.util__get_user_id_by_email (text)
from
  anon;

revoke all on function public.util__get_user_id_by_email (text)
from
  authenticated;
