set
  check_function_bodies = false;

drop trigger tr_maps__set_updated_at on public.maps;

drop policy "Users with editor access can update maps" on public.maps;

create function public.maps__owner_id_matches_stored (
  p_map_id uuid,
  p_owner_id uuid
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select m.owner_id = p_owner_id
  from public.maps m
  where m.id = p_map_id;
$function$;

revoke all on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
)
from
  anon;

revoke all on function public.maps__owner_id_matches_stored (
  uuid,
  uuid
)
from
  service_role;

create function public.maps__validate_owner_profile () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
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
$function$;

revoke all on function public.maps__validate_owner_profile ()
from
  anon;

revoke all on function public.maps__validate_owner_profile ()
from
  authenticated;

revoke all on function public.maps__validate_owner_profile ()
from
  service_role;

create function public.util__auth_user_has_resource_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_app public.app_type
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
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
          rs.principal_id = auth.uid ()
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select 1
            from public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = auth.uid ()
          ) and
          (
            rs.requires_app_access = false or
            public.util__get_auth_user_app_role (p_workspace_id, p_app) is not null
          )
        )
      )
  );
$function$;

revoke all on function public.util__auth_user_has_resource_share (
  public.resource_type,
  uuid,
  uuid,
  public.app_type
)
from
  anon;

revoke all on function public.util__auth_user_has_resource_share (
  public.resource_type,
  uuid,
  uuid,
  public.app_type
)
from
  authenticated;

revoke all on function public.util__auth_user_has_resource_share (
  public.resource_type,
  uuid,
  uuid,
  public.app_type
)
from
  service_role;

create function public.util__auth_user_may_select_map_grant (
  p_map_id uuid,
  p_workspace_id uuid,
  p_owner_id uuid,
  p_is_restricted boolean
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
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
$function$;

revoke all on function public.util__auth_user_may_select_map_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  anon;

revoke all on function public.util__auth_user_may_select_map_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  authenticated;

revoke all on function public.util__auth_user_may_select_map_grant (
  uuid,
  uuid,
  uuid,
  boolean
)
from
  service_role;

create or replace function public.util__auth_user_may_select_map (
  p_map_id uuid
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
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

  return public.util__auth_user_may_select_map_grant (
    p_map_id, v_workspace_id, v_owner_id, v_is_restricted
  );
end;
$function$;

create function public.util__auth_user_may_select_resource_base (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
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
$function$;

revoke all on function public.util__auth_user_may_select_resource_base (
  public.resource_type,
  uuid,
  uuid
)
from
  anon;

revoke all on function public.util__auth_user_may_select_resource_base (
  public.resource_type,
  uuid,
  uuid
)
from
  authenticated;

revoke all on function public.util__auth_user_may_select_resource_base (
  public.resource_type,
  uuid,
  uuid
)
from
  service_role;

create index idx_maps__owner_id on public.maps (
  owner_id
);

create index idx_maps__owner_profile_id on public.maps (
  owner_profile_id
);

create trigger tr__maps__set_updated_at before
update on public.maps for each row
execute function public.util__set_updated_at ();

create trigger tr__maps__validate_owner_profile before insert or
update of owner_id,
owner_profile_id,
workspace_id on public.maps for each row
execute function public.maps__validate_owner_profile ();

create policy "Users with editor access can update maps" on public.maps
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      id
    )
  )
with
  check (
    (
      public.util__auth_user_can_update_resource (
        'map'::public.resource_type,
        id
      ) and
      public.maps__owner_id_matches_stored (
        id,
        owner_id
      ) and
      (
        owner_id = any (
          array(
            select
              public.util__get_workspace_members (
                maps.workspace_id
              ) as util__get_workspace_members
          )
        )
      )
    )
  );
