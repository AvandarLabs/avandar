set
  check_function_bodies = false;

create function public.maps__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path to 'public' as $function$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'map workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function public.resource_shares__validate_resource_workspace () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
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
$function$;

create or replace function public.util__auth_user_can_access_resource_in_workspace (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_required_role public.role_level
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
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
$function$;

create function public.util__auth_user_may_select_map (
  p_map_id uuid
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    m.workspace_id,
    m.owner_id,
    coalesce(m.is_restricted, false)
  into v_ws, v_owner, v_restricted
  from
    public.maps m
  where
    m.id = p_map_id;

  if v_ws is null then
    return false;
  end if;

  if not (
    v_ws = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  if not public.util__auth_user_can_access_resource (
    'map'::public.resource_type,
    p_map_id,
    'viewer'::public.role_level
  ) then
    return false;
  end if;

  if public.util__can_manage_workspace_settings (v_ws) then
    return true;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  select exists (
    select
      1
    from
      public.resource_shares rs
    where
      rs.workspace_id = v_ws and
      rs.resource_type = 'map'::public.resource_type and
      rs.resource_id = p_map_id and
      (
        rs.principal_type = 'workspace'::public.share_principal_type or
        (
          rs.principal_type = 'user'::public.share_principal_type and
          rs.principal_id = v_uid
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select
              1
            from
              public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = v_uid
          ) and
          (
            rs.requires_app_access = false or
            public.util__get_auth_user_app_role (
              v_ws,
              'gis'::public.app_type
            ) is not null
          )
        )
      )
  )
  into v_has_share;

  -- Restricted rows never inherit workspace app roles; require a share grant.
  if v_restricted then
    return coalesce(v_has_share, false);
  end if;

  v_app_role := public.util__get_auth_user_app_role (
    v_ws,
    'gis'::public.app_type
  );
  v_user_rank := coalesce(public.util__role_level_rank (v_app_role), 0);

  if v_user_rank < v_editor_rank then
    return true;
  end if;

  if v_has_share then
    return true;
  end if;

  return false;
end;
$function$;

revoke all on function public.util__get_user_id_by_email (text)
from
  anon;

revoke all on function public.util__get_user_id_by_email (text)
from
  authenticated;

create or replace function public.util__is_resource_private_to_owner (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
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
$function$;

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
$function$;

create or replace function public.util__resource_type_to_app_type (
  p_resource_type public.resource_type
) returns public.app_type language sql immutable
set
  search_path to 'public' as $function$
  select case p_resource_type
    when 'dashboard'::public.resource_type then 'dashboards'::public.app_type
    when 'dataset'::public.resource_type then 'data_sources'::public.app_type
    when 'map'::public.resource_type then 'gis'::public.app_type
  end;
$function$;

create table public.maps (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid not null,
  owner_id uuid default auth.uid () not null,
  owner_profile_id uuid not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  name text not null,
  description text,
  is_public boolean default false not null,
  slug text,
  config jsonb not null,
  is_restricted boolean default false not null
);

alter table public.maps enable row level security;

alter table public.maps
add constraint maps_owner_id_fkey foreign key (
  owner_id
) references auth.users (id) on update cascade;

alter table public.maps
add constraint maps_owner_profile_id_fkey foreign key (
  owner_profile_id
) references public.user_profiles (id) on update cascade;

alter table public.maps
add constraint maps_pkey primary key (id);

alter table public.maps
add constraint maps_workspace_id_fkey foreign key (
  workspace_id
) references public.workspaces (id) on update cascade on delete cascade;

create index idx_maps__slug on public.maps (slug);

create index idx_maps__workspace_owner on public.maps (
  workspace_id,
  owner_id
);

create unique index maps__slug_unique_when_public on public.maps (slug)
where
  is_public = true and
  slug is not null;

create trigger tr__maps__prevent_workspace_id_change before
update of workspace_id on public.maps for each row
execute function public.maps__prevent_workspace_id_change ();

create trigger tr_maps__set_updated_at before
update on public.maps for each row
execute function public.util__set_updated_at ();

create policy "Users can read maps they have permissions for" on public.maps for
select
  to authenticated using (
    (
      (
        owner_id = (
          select
            auth.uid () as uid
        )
      ) or
      public.util__auth_user_may_select_map (id)
    )
  );

create policy "Users with admin access can delete maps" on public.maps for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'map'::public.resource_type,
    id
  )
);

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

create policy "Users with editor app role can insert maps" on public.maps for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      workspace_id,
      'map'::public.resource_type,
      owner_id
    )
  );
