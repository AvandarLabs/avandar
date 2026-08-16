-- The durable dashboard snapshot transition, its policy helpers, the SELECT
-- rule for drafts, and the shareable-dashboard entitlement.
--
-- This is the fold of fifteen drafting migrations that repeatedly redefined the
-- same objects while the design settled. Every object below is written once, in
-- its final form; nothing here drops or replaces anything the same file created
-- earlier. It is deliberately storage-free (see the `_STORAGE` migration that
-- follows) so nothing in it is ever replayed by the `[db.seed] sql_paths` pass.
--
-- Reading order: the `private` schema, then the enum and the columns, then the
-- CHECK constraints, then the helper functions, then the triggers, then the
-- RLS policies that depend on all of it.
--
-- Statements a schema diff cannot emit are written by hand throughout: the
-- schema-level GRANT/REVOKE below, and every function-level REVOKE. They are
-- load-bearing rather than tidiness. The helpers are `security definer` reads
-- of dashboards, billing rows and whole-workspace inventories that the caller
-- may not be able to select, so a helper left executable is a probe. Triggers
-- reach their functions through the trigger machinery, which does not consult
-- EXECUTE at all.
create schema if not exists "private";

revoke all on schema private
from
  public,
  anon,
  authenticated,
  service_role;

-- USAGE only resolves a name; EXECUTE is revoked per function below. The two
-- helpers the storage policies call are then granted EXECUTE individually,
-- because a storage policy is evaluated as the calling role.
grant usage on schema private to authenticated;

-- The four values are final. The drafting chain declared three and then widened
-- the type with a rename/recreate/column-swap/drop dance; there is nothing to
-- widen when the type is declared complete.
create type "public"."dashboard_snapshot_transition_kind" as enum(
  'publish',
  'abort_publish',
  'unpublish',
  'delete'
);

alter table "public"."dashboards"
add column "snapshot_transition_kind" public.dashboard_snapshot_transition_kind;

alter table "public"."dashboards"
add column "snapshot_transition_revision" uuid;

alter table "public"."dashboards"
add column "snapshot_transition_prior_revision" uuid;

alter table "public"."dashboards"
add column "snapshot_transition_prior_visibility" public.dashboard_visibility;

alter table "public"."dashboards"
add column "snapshot_transition_target_visibility" public.dashboard_visibility;

-- A row is either idle (every transition field null) or holds a well-formed
-- claim. `not valid` then `validate` keeps the scan out of the ACCESS EXCLUSIVE
-- window; existing rows are all idle, so the validation pass is a formality.
alter table "public"."dashboards"
add constraint "dashboards__snapshot_transition_consistent" check (
  (
    (
      (
        snapshot_transition_kind is null
      ) and
      (
        snapshot_transition_revision is null
      ) and
      (
        snapshot_transition_prior_revision is null
      ) and
      (
        snapshot_transition_prior_visibility is null
      ) and
      (
        snapshot_transition_target_visibility is null
      )
    ) or
    (
      (
        snapshot_transition_kind is not null
      ) and
      (
        snapshot_transition_revision is not null
      ) and
      (
        snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid
      ) and
      (
        snapshot_transition_revision is distinct from snapshot_revision
      ) and
      (
        snapshot_transition_prior_visibility is not null
      ) and
      (
        (
          (
            snapshot_transition_kind = any (
              array[
                'publish'::public.dashboard_snapshot_transition_kind,
                'abort_publish'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility = any (
              array[
                'workspace'::public.dashboard_visibility,
                'public'::public.dashboard_visibility
              ]
            )
          ) and
          (
            visibility = snapshot_transition_prior_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        ) or
        (
          (
            snapshot_transition_kind = any (
              array[
                'unpublish'::public.dashboard_snapshot_transition_kind,
                'delete'::public.dashboard_snapshot_transition_kind
              ]
            )
          ) and
          (
            snapshot_transition_target_visibility is null
          ) and
          (
            visibility = 'draft'::public.dashboard_visibility
          ) and
          (
            not (
              snapshot_revision is distinct from snapshot_transition_prior_revision
            )
          )
        )
      )
    )
  )
) not valid;

alter table "public"."dashboards" validate constraint "dashboards__snapshot_transition_consistent";

-- An idle row's visibility and its snapshot pointer must agree: a draft has no
-- snapshot, a published dashboard has one.
alter table "public"."dashboards"
add constraint "dashboards__settled_snapshot_consistent" check (
  (
    (
      snapshot_transition_kind is not null
    ) or
    (
      (
        visibility = 'draft'::public.dashboard_visibility
      ) and
      (
        snapshot_revision is null
      )
    ) or
    (
      (
        visibility = any (
          array[
            'workspace'::public.dashboard_visibility,
            'public'::public.dashboard_visibility
          ]
        )
      ) and
      (
        snapshot_revision is not null
      )
    )
  )
) not valid;

alter table "public"."dashboards" validate constraint "dashboards__settled_snapshot_consistent";

set
  check_function_bodies = off;

-- Storage policy helpers -----------------------------------------------------

create or replace function private.util__auth_user_can_delete_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language sql stable security definer
set
  search_path to '' as $function$
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
$function$;

revoke all on function private.util__auth_user_can_delete_dashboard_snapshot_object (
  text,
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_delete_dashboard_snapshot_object (
  text,
  text
) to authenticated;

create or replace function private.util__auth_user_can_write_dashboard_snapshot_object (
  p_bucket_id text,
  p_object_name text
) returns boolean language plpgsql security definer
set
  search_path to '' as $function$
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
$function$;

revoke all on function private.util__auth_user_can_write_dashboard_snapshot_object (
  text,
  text
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function private.util__auth_user_can_write_dashboard_snapshot_object (
  text,
  text
) to authenticated;

-- Transition validity --------------------------------------------------------

create or replace function private.dashboards__snapshot_state_is_unchanged (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path to '' as $function$
  select row(
    (p_old_dashboard).visibility,
    (p_old_dashboard).snapshot_revision,
    (p_old_dashboard).snapshot_transition_kind,
    (p_old_dashboard).snapshot_transition_revision,
    (p_old_dashboard).snapshot_transition_prior_revision,
    (p_old_dashboard).snapshot_transition_prior_visibility,
    (p_old_dashboard).snapshot_transition_target_visibility
  ) is not distinct from row(
    (p_new_dashboard).visibility,
    (p_new_dashboard).snapshot_revision,
    (p_new_dashboard).snapshot_transition_kind,
    (p_new_dashboard).snapshot_transition_revision,
    (p_new_dashboard).snapshot_transition_prior_revision,
    (p_new_dashboard).snapshot_transition_prior_visibility,
    (p_new_dashboard).snapshot_transition_target_visibility
  );
$function$;

create or replace function private.dashboards__snapshot_claim_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path to '' as $function$
  select
    (p_old_dashboard).snapshot_transition_kind is null and
    (p_new_dashboard).snapshot_transition_kind is not null and
    (p_new_dashboard).snapshot_transition_revision is not null and
    (p_new_dashboard).snapshot_transition_revision <>
      '00000000-0000-0000-0000-000000000000'::uuid and
    (p_new_dashboard).snapshot_transition_revision is distinct from
      (p_old_dashboard).snapshot_revision and
    (p_new_dashboard).snapshot_transition_prior_revision is not distinct from
      (p_old_dashboard).snapshot_revision and
    (p_new_dashboard).snapshot_transition_prior_visibility =
      (p_old_dashboard).visibility and
    (
      (
        (p_new_dashboard).snapshot_transition_kind = 'publish' and
        (p_new_dashboard).snapshot_transition_target_visibility in ('workspace', 'public') and
        (p_new_dashboard).visibility = (p_old_dashboard).visibility and
        (p_new_dashboard).snapshot_revision is not distinct from
          (p_old_dashboard).snapshot_revision
      ) or (
        (p_new_dashboard).snapshot_transition_kind in ('unpublish', 'delete') and
        (p_new_dashboard).snapshot_transition_target_visibility is null and
        (p_new_dashboard).visibility = 'draft' and
        (p_new_dashboard).snapshot_revision is not distinct from
          (p_old_dashboard).snapshot_revision
      )
    );
$function$;

-- Every one of the four transition kinds has an arm here, so no claim is
-- terminal. `delete` settles like `unpublish` rather than restoring the prior
-- audience: a delete claim authorises removing EVERY generation of the
-- dashboard's snapshots, so republishing the prior revision could point a live
-- audience at objects that are already gone. See
-- `supabase/schemas/10.dashboards.sql` for the full rationale.
create or replace function private.dashboards__snapshot_settlement_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path to '' as $function$
  select
    (
      (p_old_dashboard).snapshot_transition_kind = 'publish' and
      (p_new_dashboard).visibility =
        (p_old_dashboard).snapshot_transition_target_visibility and
      (p_new_dashboard).snapshot_revision =
        (p_old_dashboard).snapshot_transition_revision
    ) or (
      (p_old_dashboard).snapshot_transition_kind = 'abort_publish' and
      (p_new_dashboard).visibility =
        (p_old_dashboard).snapshot_transition_prior_visibility and
      (p_new_dashboard).snapshot_revision is not distinct from
        (p_old_dashboard).snapshot_transition_prior_revision
    ) or (
      (p_old_dashboard).snapshot_transition_kind in ('unpublish', 'delete') and
      (p_new_dashboard).visibility = 'draft' and
      (p_new_dashboard).snapshot_revision is null
    );
$function$;

create or replace function private.dashboards__snapshot_progress_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path to '' as $function$
  select
    (p_old_dashboard).snapshot_transition_kind is not null and
    (
      private.dashboards__snapshot_state_is_unchanged (
        p_old_dashboard,
        p_new_dashboard
      ) or (
        (p_old_dashboard).snapshot_transition_kind = 'publish' and
        (p_new_dashboard).snapshot_transition_kind = 'abort_publish' and
        row(
          (p_new_dashboard).visibility,
          (p_new_dashboard).snapshot_revision,
          (p_new_dashboard).snapshot_transition_revision,
          (p_new_dashboard).snapshot_transition_prior_revision,
          (p_new_dashboard).snapshot_transition_prior_visibility,
          (p_new_dashboard).snapshot_transition_target_visibility
        ) is not distinct from row(
          (p_old_dashboard).visibility,
          (p_old_dashboard).snapshot_revision,
          (p_old_dashboard).snapshot_transition_revision,
          (p_old_dashboard).snapshot_transition_prior_revision,
          (p_old_dashboard).snapshot_transition_prior_visibility,
          (p_old_dashboard).snapshot_transition_target_visibility
        )
      ) or (
        (p_new_dashboard).snapshot_transition_kind is null and
        (p_new_dashboard).snapshot_transition_revision is null and
        (p_new_dashboard).snapshot_transition_prior_revision is null and
        (p_new_dashboard).snapshot_transition_prior_visibility is null and
        (p_new_dashboard).snapshot_transition_target_visibility is null and
        private.dashboards__snapshot_settlement_is_valid (
          p_old_dashboard,
          p_new_dashboard
        )
      )
    );
$function$;

create or replace function private.dashboards__validate_snapshot_transition_update () returns trigger language plpgsql security definer
set
  search_path to '' as $function$
begin
  if
    private.dashboards__snapshot_state_is_unchanged (old, new) or
    private.dashboards__snapshot_claim_is_valid (old, new) or
    private.dashboards__snapshot_progress_is_valid (old, new)
  then
    return new;
  end if;

  raise exception 'illegal dashboard snapshot transition'
    using errcode = '23514';
end;
$function$;

revoke all on function private.dashboards__snapshot_state_is_unchanged (
  public.dashboards,
  public.dashboards
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke all on function private.dashboards__snapshot_claim_is_valid (
  public.dashboards,
  public.dashboards
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke all on function private.dashboards__snapshot_settlement_is_valid (
  public.dashboards,
  public.dashboards
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke all on function private.dashboards__snapshot_progress_is_valid (
  public.dashboards,
  public.dashboards
)
from
  public,
  anon,
  authenticated,
  service_role;

revoke all on function private.dashboards__validate_snapshot_transition_update ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dashboards__validate_snapshot_transition_update before
update of visibility,
snapshot_revision,
snapshot_transition_kind,
snapshot_transition_revision,
snapshot_transition_prior_revision,
snapshot_transition_prior_visibility,
snapshot_transition_target_visibility on public.dashboards for each row
execute function private.dashboards__validate_snapshot_transition_update ();

-- Publishing publicly takes the Dashboards admin role -------------------------

create or replace function private.dashboards__enforce_publish_publicly () returns trigger language plpgsql
set
  search_path to 'public' as $function$
begin
  -- The rule governs end-user requests, which PostgREST runs as `authenticated`
  -- with a JWT. The service role and direct psql writes (migrations, seeds,
  -- pgTAP setup) already bypass RLS entirely, so gating them here would break
  -- trusted paths without adding a boundary.
  --
  -- Both halves are load-bearing. `auth.uid()` alone is not enough because a
  -- psql session that switches to `postgres` can still carry a leftover
  -- `request.jwt.claims`, which is exactly what the storage pgTAP fixtures do.
  -- `current_user` alone is not enough because an `authenticated` request with
  -- no resolvable subject has no role to check against. The function is
  -- SECURITY INVOKER on purpose: under SECURITY DEFINER `current_user` would be
  -- the function owner rather than the caller.
  if current_user <> 'authenticated' or auth.uid () is null then
    return new;
  end if;

  if (
    (
      new.visibility = 'public'::public.dashboard_visibility and
      old.visibility is distinct from 'public'::public.dashboard_visibility
    ) or
    (
      new.snapshot_transition_target_visibility =
        'public'::public.dashboard_visibility and
      old.snapshot_transition_target_visibility is distinct from
        'public'::public.dashboard_visibility
    )
  )
    -- The role is checked against OLD.workspace_id, never NEW.workspace_id.
    -- NEW is attacker-controlled in the same statement, so reading it would let
    -- a caller name a workspace they are admin of to authorize publishing a
    -- dashboard that lives somewhere else.
    -- `tr__dashboards__prevent_workspace_id_change` also rejects that, but only
    -- because its name happens to sort after this one, and trigger firing order
    -- is not a boundary worth depending on.
    and not public.util__auth_user_meets_min_app_role (
      old.workspace_id,
      'dashboards'::public.app_type,
      'admin'::public.role_level
    ) then
    raise exception 'Publishing a dashboard publicly requires the Dashboards admin role'
    using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function private.dashboards__enforce_publish_publicly ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dashboards__enforce_publish_publicly before
update of visibility,
snapshot_transition_target_visibility on public.dashboards for each row
execute function private.dashboards__enforce_publish_publicly ();

-- Drafts are hidden from readers who cannot edit them --------------------------
--
-- `visibility` had no effect on SELECT at all: a viewer share or a workspace
-- `viewer` dashboards app role still read the whole row, `config` jsonb
-- included, for a dashboard the client refuses to open. Past the owner and
-- settings admin short-circuits, a draft now requires `editor` on the resource.
create or replace function public.util__auth_user_may_select_dashboard (
  p_dashboard_id uuid
) returns boolean language plpgsql stable security definer
set
  search_path to 'public' as $function$
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
$function$;

-- The shareable-dashboard entitlement ------------------------------------------

create or replace function public.util__dashboard_counts_as_shareable (
  p_dashboard_id uuid
) returns boolean language sql stable security definer
set
  search_path to 'public' as $function$
  select coalesce(
    (
      select
        d.visibility = 'public'::public.dashboard_visibility or
        (
          d.visibility = 'workspace'::public.dashboard_visibility and
          not public.util__is_resource_private_to_owner (
            'dashboard'::public.resource_type,
            d.id
          )
        )
      from public.dashboards d
      where d.id = p_dashboard_id
    ),
    false
  );
$function$;

revoke
execute on function public.util__dashboard_counts_as_shareable (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

create or replace function public.util__workspace_max_shareable_dashboards (
  p_workspace_id uuid
) returns integer language plpgsql stable security definer
set
  search_path to 'public' as $function$
declare
  v_free_limit constant integer := 1;
  v_status public.subscriptions__status;
  v_max integer;
begin
  select s.subscription_status, s.max_shareable_dashboards_allowed
  into v_status, v_max
  from public.subscriptions s
  where s.workspace_id = p_workspace_id
  limit 1;

  if v_status is null then
    return v_free_limit;
  end if;

  if v_status not in ('active'::public.subscriptions__status,
                      'trialing'::public.subscriptions__status) then
    return v_free_limit;
  end if;

  return v_max;
end;
$function$;

revoke
execute on function public.util__workspace_max_shareable_dashboards (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

create or replace function private.dashboards__assert_shareable_within_limit (
  p_dashboard_id uuid
) returns void language plpgsql security definer
set
  search_path to 'public' as $function$
declare
  v_workspace_id uuid;
  v_max integer;
  v_count integer;
begin
  -- The same exemption as `private.dashboards__enforce_publish_publicly`, and
  -- for the same reason: end-user traffic arrives as `authenticated` through
  -- PostgREST, while the service role, edge functions, migrations and pgTAP
  -- fixtures write through paths that already bypass RLS, so gating them here
  -- would break trusted work without adding a boundary. `auth.uid()` alone is
  -- not enough, because a psql session that switches to `postgres` can still
  -- carry a leftover `request.jwt.claims`.
  --
  -- `current_setting('role')` rather than that trigger's `current_user`, and
  -- the difference is load-bearing. This function is SECURITY DEFINER, so
  -- `current_user` here is its owner and never the caller: phrased on
  -- `current_user` the exemption would fire for everybody and silently disable
  -- the entire cap. The `role` GUC is what `set role` writes, so it still
  -- reports `authenticated` inside a definer function, which was verified
  -- directly before this was written. It reads `none` on a psql session that
  -- never switched role.
  if
    coalesce(current_setting('role', true), 'none') <> 'authenticated' or
    auth.uid () is null
  then
    return;
  end if;

  if not public.util__dashboard_counts_as_shareable (p_dashboard_id) then
    return;
  end if;

  select d.workspace_id into v_workspace_id
  from public.dashboards d
  where d.id = p_dashboard_id;

  if v_workspace_id is null then
    return;
  end if;

  v_max := public.util__workspace_max_shareable_dashboards (v_workspace_id);

  if v_max is null then
    return;
  end if;

  select count(*)::int into v_count
  from public.dashboards d
  where
    d.workspace_id = v_workspace_id and
    d.id <> p_dashboard_id and
    public.util__dashboard_counts_as_shareable (d.id);

  if v_count >= v_max then
    -- The `hint` is a CONTRACT with the client and must not be reworded.
    -- PostgREST passes `hint` through to the JSON error body, so
    -- `isShareableDashboardLimitError` in
    -- `src/utils/isShareableDashboardLimitError/isShareableDashboardLimitError.ts`
    -- matches on this exact string to tell the plan limit apart from every
    -- other rejection. Matching on the message instead would break the moment
    -- the copy is edited, and `42501` alone is raised by other policies
    -- (`dashboards__enforce_publish_publicly` among them), so neither the
    -- message nor the code is usable as the marker on its own.
    raise exception
      'This workspace''s plan allows % shared or public dashboard(s)', v_max
    using errcode = '42501', hint = 'shareable_dashboard_limit';
  end if;
end;
$function$;

revoke
execute on function private.dashboards__assert_shareable_within_limit (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

create or replace function private.dashboards__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
begin
  perform private.dashboards__assert_shareable_within_limit (new.id);
  return null;
end;
$function$;

revoke
execute on function private.dashboards__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

create or replace function private.resource_shares__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path to 'public' as $function$
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    perform private.dashboards__assert_shareable_within_limit (new.resource_id);
  end if;

  return null;
end;
$function$;

revoke
execute on function private.resource_shares__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__dashboards__enforce_shareable_limit
after insert
or
update of visibility,
is_restricted on public.dashboards for each row
execute function private.dashboards__enforce_shareable_limit ();

create trigger tr__resource_shares__enforce_shareable_limit
after insert
or
update on public.resource_shares for each row
execute function private.resource_shares__enforce_shareable_limit ();

-- RLS ---------------------------------------------------------------------------
--
-- All three policies already exist (they predate this branch), so they are
-- dropped and recreated with the transition-state requirements added. See
-- `supabase/schemas/17.rls.dashboards.sql` for the CRUD matrix.

drop policy "Users with editor app role can insert dashboards" on "public"."dashboards";

create policy "Users with editor app role can insert dashboards" on "public"."dashboards" as permissive for insert to authenticated
with
  check (
    (
      public.util__auth_user_can_insert_workspace_resource (
        workspace_id,
        'dashboard'::public.resource_type,
        owner_id
      ) and
      (
        snapshot_transition_kind is null
      ) and
      (
        visibility = 'draft'::public.dashboard_visibility
      )
    )
  );

drop policy "Users with editor access can update dashboards" on "public"."dashboards";

create policy "Users with editor access can update dashboards" on "public"."dashboards" as permissive
for update
  to authenticated using (
    (
      public.util__auth_user_can_update_resource (
        'dashboard'::public.resource_type,
        id
      ) and
      (
        (
          snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind
        ) or
        public.util__auth_user_can_delete_resource (
          'dashboard'::public.resource_type,
          id
        )
      )
    )
  )
with
  check (
    (
      public.util__auth_user_can_update_resource (
        'dashboard'::public.resource_type,
        id
      ) and
      (
        (
          snapshot_transition_kind is distinct from 'delete'::public.dashboard_snapshot_transition_kind
        ) or
        public.util__auth_user_can_delete_resource (
          'dashboard'::public.resource_type,
          id
        )
      ) and
      (
        owner_id = any (
          array(
            select
              public.util__get_workspace_members (
                dashboards.workspace_id
              ) as util__get_workspace_members
          )
        )
      )
    )
  );

drop policy "Users with admin access can delete dashboards" on "public"."dashboards";

create policy "Users with admin access can delete dashboards" on "public"."dashboards" as permissive for delete to authenticated using (
  (
    public.util__auth_user_can_delete_resource (
      'dashboard'::public.resource_type,
      id
    ) and
    (
      snapshot_transition_kind = 'delete'::public.dashboard_snapshot_transition_kind
    ) and
    (
      snapshot_transition_revision is not null
    ) and
    (
      snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid
    ) and
    (
      snapshot_transition_revision is distinct from snapshot_revision
    ) and
    (
      snapshot_transition_target_visibility is null
    ) and
    (
      snapshot_transition_prior_visibility is not null
    ) and
    (
      visibility = 'draft'::public.dashboard_visibility
    ) and
    (
      not (
        snapshot_revision is distinct from snapshot_transition_prior_revision
      )
    )
  )
);
