drop policy if exists "Members can select resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy if exists "Resource admins can delete resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy if exists "Resource admins can insert resource_user_group_tags" on "public"."resource_user_group_tags";

drop policy if exists "Resource admins can update resource_user_group_tags" on "public"."resource_user_group_tags";

revoke delete on table "public"."resource_user_group_tags"
from
  "anon";

revoke insert on table "public"."resource_user_group_tags"
from
  "anon";

revoke references on table "public"."resource_user_group_tags"
from
  "anon";

revoke
select
  on table "public"."resource_user_group_tags"
from
  "anon";

revoke trigger on table "public"."resource_user_group_tags"
from
  "anon";

revoke
truncate on table "public"."resource_user_group_tags"
from
  "anon";

revoke
update on table "public"."resource_user_group_tags"
from
  "anon";

revoke delete on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke insert on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke references on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke
select
  on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke trigger on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke
truncate on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke
update on table "public"."resource_user_group_tags"
from
  "authenticated";

revoke delete on table "public"."resource_user_group_tags"
from
  "service_role";

revoke insert on table "public"."resource_user_group_tags"
from
  "service_role";

revoke references on table "public"."resource_user_group_tags"
from
  "service_role";

revoke
select
  on table "public"."resource_user_group_tags"
from
  "service_role";

revoke trigger on table "public"."resource_user_group_tags"
from
  "service_role";

revoke
truncate on table "public"."resource_user_group_tags"
from
  "service_role";

revoke
update on table "public"."resource_user_group_tags"
from
  "service_role";

alter table "public"."resource_user_group_tags"
drop constraint if exists "resource_user_group_tags__resource_tag";

alter table "public"."resource_user_group_tags"
drop constraint if exists "resource_user_group_tags_user_group_id_fkey";

alter table "public"."resource_user_group_tags"
drop constraint if exists "resource_user_group_tags_workspace_id_fkey";

alter table "public"."resource_user_group_tags"
drop constraint if exists "resource_user_group_tags_pkey";

drop index if exists "public"."idx_resource_user_group_tags__resource";

drop index if exists "public"."resource_user_group_tags__resource_tag";

drop index if exists "public"."resource_user_group_tags_pkey";

drop table if exists "public"."resource_user_group_tags";

set
  check_function_bodies = off;

create or replace function public.util__resource_effective_role (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns public.role_level language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_workspace_id uuid;
  v_owner_id uuid;
  v_is_restricted boolean;
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
$function$;
