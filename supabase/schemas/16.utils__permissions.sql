/**
 * Rank ordering for role_level (viewer < editor < admin).
 *
 * @returns Integer rank 1–3.
 */
create or replace function public.util__role_level_rank (
  p_role public.role_level
) returns int language sql immutable as $$
  select case p_role
    when 'viewer'::public.role_level then 1
    when 'editor'::public.role_level then 2
    when 'admin'::public.role_level then 3
  end;
$$;

/**
 * Maps a rank back to role_level for aggregate results.
 *
 * @returns Matching role_level or null when rank is zero.
 */
create or replace function public.util__rank_to_role_level (
  p_rank int
) returns public.role_level language sql immutable as $$
  select case p_rank
    when 1 then 'viewer'::public.role_level
    when 2 then 'editor'::public.role_level
    when 3 then 'admin'::public.role_level
    else null::public.role_level
  end;
$$;

/**
 * Whether the auth user is a Settings admin (Global admin) in the workspace.
 *
 * @returns True when settings app role is admin.
 */
create or replace function public.util__is_settings_admin (
  p_workspace_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.user_app_roles uar
    where
      uar.workspace_id = p_workspace_id and
      uar.user_id = auth.uid () and
      uar.app = 'settings'::public.app_type and
      uar.role = 'admin'::public.role_level
  );
$$;

/**
 * Auth user's role for one app in a workspace.
 *
 * @returns Role level when present.
 */
create or replace function public.util__get_auth_user_app_role (
  p_workspace_id uuid,
  p_app public.app_type
) returns public.role_level language sql security definer stable
set
  search_path = public as $$
  select uar.role
  from public.user_app_roles uar
  where
    uar.workspace_id = p_workspace_id and
    uar.user_id = auth.uid () and
    uar.app = p_app
  limit 1;
$$;

/**
 * Distinct user_group ids the auth user belongs to in this workspace.
 *
 * @returns Array of user_group ids (possibly empty).
 */
create or replace function public.util__get_auth_user_user_group_ids (
  p_workspace_id uuid
) returns uuid[] language sql security definer stable
set
  search_path = public as $$
  select coalesce(
    array_agg(distinct ugm.user_group_id),
    '{}'::uuid[]
  )
  from public.user_group_memberships ugm
  inner join public.user_groups ug on ug.id = ugm.user_group_id
  where ugm.user_id = auth.uid () and ug.workspace_id = p_workspace_id;
$$;

/**
 * Effective role for auth.uid() on a dashboard or dataset row.
 *
 * @returns Highest role_level from owner/settings shortcuts, shares, and
 *   tag-gated app roles when applicable.
 */
create or replace function public.util__resource_effective_role (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns public.role_level language plpgsql security definer stable
set
  search_path = public as $$
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

  if p_resource_type = 'dashboard'::public.resource_type then
    select
      d.workspace_id,
      d.owner_id,
      coalesce(d.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.dashboards d
    where
      d.id = p_resource_id;
    v_app := 'dashboards'::public.app_type;
  elsif p_resource_type = 'dataset'::public.resource_type then
    select
      ds.workspace_id,
      ds.owner_id,
      coalesce(ds.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.datasets ds
    where
      ds.id = p_resource_id;
    v_app := 'data_sources'::public.app_type;
  else
    return null;
  end if;

  if v_workspace_id is null then
    return null;
  end if;

  if v_owner_id = v_uid then
    return 'admin'::public.role_level;
  end if;

  if public.util__is_settings_admin (v_workspace_id) then
    return 'admin'::public.role_level;
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
        rs.principal_type = 'user'::public.share_principal_type and
        rs.principal_id = v_uid
      ) or
      (
        rs.principal_type = 'workspace'::public.share_principal_type and
        rs.principal_id is null
      ) or
      (
        rs.principal_type = 'user_group'::public.share_principal_type and
        rs.principal_id is not null and
        exists (
          select 1
          from public.user_group_memberships ugm
          where
            ugm.user_group_id = rs.principal_id and
            ugm.user_id = v_uid
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
$$;

/**
 * Whether the auth user meets at least the minimum role on a resource.
 *
 * @returns True when effective role is at least p_min_role.
 */
create or replace function public.util__auth_user_can_access_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_min_role public.role_level
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_eff public.role_level;
  v_eff_rank int;
  v_min_rank int;
begin
  v_eff := public.util__resource_effective_role (p_resource_type, p_resource_id);

  if v_eff is null then
    return false;
  end if;

  v_eff_rank := public.util__role_level_rank (v_eff);
  v_min_rank := public.util__role_level_rank (p_min_role);
  return v_eff_rank >= v_min_rank;
end;
$$;
