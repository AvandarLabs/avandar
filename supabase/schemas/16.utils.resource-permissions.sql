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
 * Most paths merge several independent grants (direct/group/workspace shares,
 * and optionally the user's app role on this resource's app). Each grant is
 * converted with util__role_level_rank (viewer=1, editor=2, admin=3); the
 * function keeps the single largest rank and maps it back with
 * util__rank_to_role_level. So "highest role_level" means the strongest of
 * those candidates, not "most roles" or "first match".
 *
 * Short-circuits (no merge with shares):
 * - Resource owner → admin.
 * - Settings (global) admin in the workspace → admin.
 *
 * Examples (non-owner, non-settings-admin):
 * - Workspace share viewer + app role editor → editor.
 * - Direct user share admin + app role viewer → admin (ranks 3 vs 1).
 * - Only workspace share viewer, resource is_restricted, no other grant →
 *   viewer.
 * - Group share editor + requires_app_access=true, user has no app role on
 *   resource's app → that share candidate is dropped; merge proceeds without it.
 *
 * After owner and settings-admin short-circuits, every other grant path
 * requires a `workspace_memberships` row for this resource's workspace so
 * shares and app roles cannot expose workspace data to unrelated users.
 * Public dashboard read remains handled in RLS (`is_public`), not here.
 *
 * @returns Merged role_level, or null when no candidate grants access.
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

/**
 * App catalog entry for a dashboard or dataset resource type.
 */
create or replace function public.util__resource_type_to_app_type (
  p_resource_type public.resource_type
) returns public.app_type language sql immutable
set
  search_path = public as $$
  select case p_resource_type
    when 'dashboard'::public.resource_type then 'dashboards'::public.app_type
    when 'dataset'::public.resource_type then 'data_sources'::public.app_type
  end;
$$;

/**
 * INSERT on `dashboards` / `datasets`: editor+ app role in workspace, caller
 * owns the row, workspace is a member workspace.
 */
create or replace function public.util__auth_user_can_insert_workspace_resource (
  p_workspace_id uuid,
  p_resource_type public.resource_type,
  p_owner_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_app public.app_type;
begin
  if v_uid is null or p_owner_id is distinct from v_uid then
    return false;
  end if;

  if not (
    p_workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  v_app := public.util__resource_type_to_app_type (p_resource_type);

  return public.util__auth_user_meets_min_app_role (
    p_workspace_id,
    v_app,
    'editor'::public.role_level
  );
end;
$$;

/**
 * UPDATE on a dashboard or dataset: effective role is at least editor.
 */
create or replace function public.util__auth_user_can_update_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.util__auth_user_can_access_resource (
    p_resource_type,
    p_resource_id,
    'editor'::public.role_level
  );
$$;

/**
 * DELETE on a dashboard or dataset: effective role is at least admin.
 */
create or replace function public.util__auth_user_can_delete_resource (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select public.util__auth_user_can_access_resource (
    p_resource_type,
    p_resource_id,
    'admin'::public.role_level
  );
$$;

/**
 * Whether the auth user may SELECT a dataset row under hardened RLS.
 *
 * Blocks workspace members whose only grant on an unrestricted row is a
 * workspace-wide app role at editor+ (e.g. Global Editor) from reading
 * another user’s dataset, while keeping viewers, owners, settings/workspace
 * managers, restricted-resource paths, and explicit `resource_shares` grants.
 * Group shares with requires_app_access=true additionally require the auth
 * user to have a data_sources app role.
 *
 * @param p_dataset_id Primary key of `public.datasets`.
 * @returns True when the row should be visible to `auth.uid()`.
 */
create or replace function public.util__auth_user_may_select_dataset (
  p_dataset_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
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
    ds.workspace_id,
    ds.owner_id,
    coalesce(ds.is_restricted, false)
  into v_ws, v_owner, v_restricted
  from
    public.datasets ds
  where
    ds.id = p_dataset_id;

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
    'dataset'::public.resource_type,
    p_dataset_id,
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
      rs.resource_type = 'dataset'::public.resource_type and
      rs.resource_id = p_dataset_id and
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
              'data_sources'::public.app_type
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
    'data_sources'::public.app_type
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
$$;

/**
 * Whether the auth user may SELECT a dashboard row under hardened RLS.
 *
 * Public dashboards (`is_public`) are readable by any authenticated user.
 * Otherwise applies the same editor-only block as
 * `util__auth_user_may_select_dataset` with app `dashboards`.
 * Group shares with requires_app_access=true additionally require the auth
 * user to have a dashboards app role.
 *
 * @param p_dashboard_id Primary key of `public.dashboards`.
 * @returns True when the row should be visible to `auth.uid()`.
 */
create or replace function public.util__auth_user_may_select_dashboard (
  p_dashboard_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_public boolean;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    d.workspace_id,
    d.owner_id,
    coalesce(d.is_restricted, false),
    coalesce(d.is_public, false)
  into v_ws, v_owner, v_restricted, v_public
  from
    public.dashboards d
  where
    d.id = p_dashboard_id;

  if v_ws is null then
    return false;
  end if;

  if v_public then
    return true;
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
    'dashboard'::public.resource_type,
    p_dashboard_id,
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
      rs.resource_type = 'dashboard'::public.resource_type and
      rs.resource_id = p_dashboard_id and
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
              'dashboards'::public.app_type
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
    'dashboards'::public.app_type
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
$$;
