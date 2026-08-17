/**
 * Distinct user_group ids the auth user belongs to in this workspace.
 *
 * @returns Array of user_group ids (possibly empty).
 */
create or replace function public.util__get_auth_user_user_group_ids (p_workspace_id uuid) returns uuid[] language sql security definer stable
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
 * Whether any share on this resource grants a principal other than its owner.
 *
 * `principal_type <> 'user'` is what catches workspace and user_group
 * principals: workspace shares carry a NULL `principal_id` by convention, so
 * comparing `principal_id` alone would miss them. `is distinct from` keeps a
 * NULL `principal_id` on a user-type row from evaluating to NULL and silently
 * dropping that row.
 *
 * Deliberately ignores `requires_app_access`. A group share that currently
 * reaches nobody is still an expressed intent to share, so the resource is not
 * private.
 *
 * Takes the owner id from the caller rather than looking it up, because the
 * RLS-hot callers already hold it and this runs per row.
 *
 * @param p_owner_id The resource's owner, supplied by the caller.
 * @returns True when at least one non-owner share row exists.
 */
create or replace function public.util__has_non_owner_share (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_owner_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
  select exists (
    select 1
    from public.resource_shares rs
    where
      rs.resource_type = p_resource_type and
      rs.resource_id = p_resource_id and
      rs.workspace_id = p_workspace_id and
      (
        rs.principal_type <> 'user'::public.share_principal_type or
        rs.principal_id is distinct from p_owner_id
      )
  );
$$;

revoke
execute on function public.util__has_non_owner_share (public.resource_type, uuid, uuid, uuid)
from
  public,
  anon,
  authenticated;

/**
 * Whether a resource is private to its owner: restricted, with no share
 * granting any principal other than the owner.
 *
 * Resource-type generic, so it knows nothing about publication. A dashboard can
 * be `is_public` while restricted with no shares, which is world-readable and
 * emphatically not private; callers that care must compose this with their own
 * visibility condition.
 *
 * Prefer `util__has_non_owner_share` directly when you already hold the row's
 * `owner_id` and `is_restricted`, to avoid this function's extra lookup.
 *
 * @returns True when only the owner has been granted access. False when the
 *   resource does not exist.
 */
create or replace function public.util__is_resource_private_to_owner (
  p_resource_type public.resource_type,
  p_resource_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
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
$$;

revoke
execute on function public.util__is_resource_private_to_owner (public.resource_type, uuid)
from
  public,
  anon,
  authenticated;

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
 * - Settings (global) admin in the workspace → admin, UNLESS the resource is
 *   private to its owner (restricted with zero non-owner shares) and not a
 *   public dashboard.
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
 * Whether the auth user has the requested resource role in the given workspace.
 *
 * Binding the workspace to the resource prevents a caller from authorizing a
 * share row with a workspace id that does not belong to the resource.
 */
create or replace function public.util__auth_user_can_access_resource_in_workspace (
  p_resource_type public.resource_type,
  p_resource_id uuid,
  p_workspace_id uuid,
  p_required_role public.role_level
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
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
$$;

/**
 * App catalog entry for a dashboard or dataset resource type.
 */
create or replace function public.util__resource_type_to_app_type (p_resource_type public.resource_type) returns public.app_type language sql immutable
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
create or replace function public.util__auth_user_may_select_dataset (p_dataset_id uuid) returns boolean language plpgsql security definer stable
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
 * Dashboards additionally have a publication state that datasets do not.
 * A `draft` is visible only to those who could edit it: the owner, a settings
 * admin, and any grant worth `editor` or better. A viewer-level grant, whether
 * a share or a workspace app role, does NOT open a draft. That is what gives
 * `draft` its product meaning, that the owner decides when the dashboard is
 * ready for others to see, and it keeps the `config` jsonb off the wire for
 * readers the UI would refuse anyway.
 *
 * @param p_dashboard_id Primary key of `public.dashboards`.
 * @returns True when the row should be visible to `auth.uid()`.
 */
create or replace function public.util__auth_user_may_select_dashboard (p_dashboard_id uuid) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_public boolean;
  v_visibility public.dashboard_visibility;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_eff_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    d.workspace_id,
    d.owner_id,
    coalesce(d.is_restricted, false),
    coalesce(d.is_public, false),
    d.visibility
  into v_ws, v_owner, v_restricted, v_public, v_visibility
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

  -- The effective role is resolved ONCE and reused by both the viewer gate
  -- below and the `draft` gate further down. `util__auth_user_can_access_resource`
  -- is exactly `rank(effective_role) >= rank(min_role)` with a null effective
  -- role meaning "no access", so ranking it here is behaviour-identical to two
  -- calls, but it avoids re-entering `util__resource_effective_role` (a second
  -- dashboards fetch, settings-admin join, share aggregate and app-role probe)
  -- for every draft row the caller does not own. `stable` does not memoize
  -- across rows, so the duplicate call would double per-row cost on the whole
  -- dashboards index.
  v_eff_rank := coalesce(
    public.util__role_level_rank (
      public.util__resource_effective_role (
        'dashboard'::public.resource_type,
        p_dashboard_id
      )
    ), 0);

  if v_eff_rank < public.util__role_level_rank ('viewer'::public.role_level) then
    return false;
  end if;

  if public.util__can_manage_workspace_settings (v_ws) then
    return true;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  -- `draft` means the owner has not decided this dashboard is ready for anyone
  -- else, which is the product meaning P2 gave the state and P3's publishing
  -- control finally makes actionable. Owners and settings admins short-circuit
  -- above; what remains here is share holders and workspace app roles, and for
  -- a draft those need edit rights rather than mere read access.
  if v_visibility = 'draft'::public.dashboard_visibility
    and v_eff_rank < v_editor_rank then
    return false;
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

/**
 * Dataset id encoded in a `workspaces` storage bucket object name, or null.
 *
 * Object names are `<workspaceId>/datasets/<datasetId>.parquet` (see
 * getDatasetParquetStoragePath in
 * src/clients/storage/DatasetParquetStorageClient/utils.ts). The dataset id
 * lives in the FILENAME, not a folder segment, so storage.foldername() cannot
 * reach it and split_part is used instead.
 *
 * Returns null rather than raising when the name does not match that shape, so
 * a storage policy referencing this can never error on an unexpected object
 * name. Callers MUST treat null as "deny": an object whose dataset cannot be
 * identified is not one we can prove the caller may read.
 *
 * @returns The dataset id, or null when the name is not a dataset parquet path.
 */
create or replace function public.util__storage_object_dataset_id (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when split_part(p_object_name, '/', 3) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then replace(split_part(p_object_name, '/', 3), '.parquet', '')::uuid
    else null
  end;
$$;

/**
 * Extracts a workspace UUID from the first segment of a storage object path.
 *
 * @returns The UUID, or NULL when the path segment is not a UUID.
 */
create or replace function public.util__storage_object_workspace_id (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when split_part(p_object_name, '/', 1) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_object_name, '/', 1)::uuid
    else null
  end;
$$;

/**
 * Extracts a dashboard UUID from a published snapshot object path.
 *
 * Versioned snapshot objects are named
 * `dashboards/<dashboardId>/revisions/<revision>/datasets/<datasetId>.parquet`.
 * Legacy objects use `dashboards/<dashboardId>/datasets/<datasetId>.parquet`.
 *
 * Returns NULL for any name that does not match that shape, including a
 * non-UUID id segment. NULL is DENY in the storage policies that call this:
 * an object whose dashboard cannot be identified is not one we can prove the
 * caller may read. Returning NULL rather than casting blindly also keeps a
 * malformed upload a policy denial instead of a storage error.
 *
 * @param p_object_name The `storage.objects.name` value.
 * @returns The dashboard UUID, or NULL when the path is not a snapshot path.
 */
create or replace function public.util__storage_object_dashboard_id (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
      or p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then split_part(p_object_name, '/', 2)::uuid
    else null
  end;
$$;

/**
 * Extracts a revision UUID from an exact published snapshot object path.
 *
 * Exact legacy paths map to the all-zero UUID reserved for the legacy
 * generation. Returns NULL for malformed or extended paths so storage policies
 * fail closed instead of authorizing an object whose generation is ambiguous.
 *
 * @param p_object_name The `storage.objects.name` value.
 * @returns The snapshot revision, or NULL when the path is not exact.
 */
create or replace function public.util__storage_object_snapshot_revision (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  select case
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/revisions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then split_part(p_object_name, '/', 4)::uuid
    when p_object_name ~
      '^dashboards/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/datasets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.parquet$'
    then '00000000-0000-0000-0000-000000000000'::uuid
    else null
  end;
$$;

/**
 * Whether the auth user may mutate an uncommitted dashboard snapshot object.
 *
 * The security-definer lookup is required because dashboard SELECT RLS can
 * hide draft dashboards from workspace editors who still have update access.
 * The authorization check prevents callers from using this helper to probe or
 * mutate dashboards they cannot edit.
 *
 * The bucket is the discriminator for the extra admin requirement because the
 * bucket, not the claim, is what decides who can read the bytes.
 * `private.dashboards__enforce_publish_publicly` guards the DECISION to expose
 * a dashboard to the open internet; this guards the CONTENT that decision
 * publishes. Without the bucket check an editor could overwrite the objects of
 * an admin's open public claim, and the admin would then settle a transition
 * over data no admin ever approved. `published-private` stays editor-tier
 * because publishing internally is ordinary editor work.
 *
 * The admin bar is `util__auth_user_meets_min_app_role`, the same predicate the
 * transition trigger uses, so the two gates agree; in particular both treat the
 * workspace owner as an admin.
 *
 * @param p_bucket_id The `storage.objects.bucket_id` value.
 * @param p_object_name The exact `storage.objects.name` value.
 * @returns True only for an editor, the active staged revision, and its bucket,
 *   and additionally only for a dashboards admin when the bucket is public.
 */
create or replace function private.util__auth_user_can_write_dashboard_snapshot_object (p_bucket_id text, p_object_name text) returns boolean language plpgsql security definer volatile
set
  search_path = '' as $$
declare
  can_write boolean;
begin
  select
    public.util__auth_user_can_update_resource (
      'dashboard'::public.resource_type,
      dashboards.id
    ) and
    (
      p_bucket_id <> 'published' or
      public.util__auth_user_meets_min_app_role (
        dashboards.workspace_id,
        'dashboards'::public.app_type,
        'admin'::public.role_level
      )
    ) and
    dashboards.snapshot_transition_kind = 'publish' and
    dashboards.snapshot_transition_revision =
      public.util__storage_object_snapshot_revision (p_object_name) and
    (
      (
        dashboards.snapshot_transition_target_visibility = 'public' and
        p_bucket_id = 'published'
      ) or (
        dashboards.snapshot_transition_target_visibility = 'workspace' and
        p_bucket_id = 'published-private'
      )
    )
  into can_write
  from public.dashboards
  where
    dashboards.id = public.util__storage_object_dashboard_id (p_object_name)
  for share;

  return coalesce(can_write, false);
end;
$$;

revoke all on function private.util__auth_user_can_write_dashboard_snapshot_object (text, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_write_dashboard_snapshot_object (text, text) to authenticated;

/**
 * Whether the auth user may delete a dashboard snapshot object.
 *
 * Delete transitions require admin access. Other cleanup paths require editor
 * access because editors may unpublish or abort their own publication attempt.
 *
 * Deliberately NOT mirrored from
 * `util__auth_user_can_write_dashboard_snapshot_object`: the bucket is not a
 * discriminator here. Writing into `published` CREATES exposure, so it takes
 * the dashboards admin bar; deleting from it REMOVES exposure. Requiring admin
 * to delete would only strand staged bytes in the world-readable bucket
 * whenever the editor who uploaded them cannot clean them up.
 *
 * @param p_bucket_id The `storage.objects.bucket_id` value.
 * @param p_object_name The exact `storage.objects.name` value.
 * @returns True only with the required role and matching durable cleanup claim.
 */
create or replace function private.util__auth_user_can_delete_dashboard_snapshot_object (p_bucket_id text, p_object_name text) returns boolean language sql security definer stable
set
  search_path = '' as $$
  select coalesce(
    exists (
      select 1
      from public.dashboards
      where
        dashboards.id = public.util__storage_object_dashboard_id (
          p_object_name
        ) and
        case dashboards.snapshot_transition_kind
          when 'delete' then
            public.util__auth_user_can_delete_resource (
              'dashboard'::public.resource_type,
              dashboards.id
            )
          else
            public.util__auth_user_can_update_resource (
              'dashboard'::public.resource_type,
              dashboards.id
            )
        end and
        case dashboards.snapshot_transition_kind
          when 'unpublish' then true
          when 'delete' then true
          when 'abort_publish' then
            dashboards.snapshot_transition_revision =
              public.util__storage_object_snapshot_revision (p_object_name) and
            (
              (
                dashboards.snapshot_transition_target_visibility = 'public' and
                p_bucket_id = 'published'
              ) or (
                dashboards.snapshot_transition_target_visibility = 'workspace' and
                p_bucket_id = 'published-private'
              )
            )
          when 'publish' then
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name) and
            dashboards.snapshot_transition_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
          else
            dashboards.snapshot_revision is distinct from
              public.util__storage_object_snapshot_revision (p_object_name)
        end
    ),
    false
  );
$$;

revoke all on function private.util__auth_user_can_delete_dashboard_snapshot_object (text, text)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_delete_dashboard_snapshot_object (text, text) to authenticated;
