create table public.dashboards (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this dashboard belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. We cannot delete users that still own a dashboard
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own a dashboard.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the dashboard was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the dashboard was last updated.
  updated_at timestamptz not null default now(),
  -- Name of the dashboard
  name text not null,
  -- Description of the dashboard
  description text,
  -- Publication state. See `00.enum.dashboard_visibility.sql`.
  visibility public.dashboard_visibility not null default 'draft',
  -- Whether the dashboard is public. Derived from `visibility` rather than
  -- stored, so the anon RLS policy in `17.rls.dashboards.sql`, the `is_public`
  -- short-circuits in `16.utils.resource-permissions.sql`, and every read-side
  -- TS call site keep working with no edit.
  --
  -- Declared immediately AFTER `visibility` on purpose: a generated column has
  -- to be able to see the column it reads. This is the one place we do not
  -- follow the "append new columns at the end" convention.
  is_public boolean generated always as (
    visibility = 'public'::public.dashboard_visibility
  ) stored not null,
  -- Optional unique slug for sharing/dashboard URLs
  slug text,
  -- The dashboard's full config as a JSON blob
  config jsonb not null,
  -- When true, tag-based app roles do not apply; shares still can
  is_restricted boolean not null default false,
  -- UUID of the complete snapshot generation readers may access. The all-zero
  -- UUID is reserved for objects stored at the legacy unversioned path.
  snapshot_revision uuid,
  -- Durable, mutually-exclusive snapshot transition claim. For publish the
  -- revision is also the staged object generation. Cleanup transitions use it
  -- as an opaque token while retaining the prior reader boundary explicitly.
  snapshot_transition_kind public.dashboard_snapshot_transition_kind,
  snapshot_transition_revision uuid,
  snapshot_transition_prior_revision uuid,
  snapshot_transition_prior_visibility public.dashboard_visibility,
  snapshot_transition_target_visibility public.dashboard_visibility,
  constraint dashboards__settled_snapshot_consistent check (
    snapshot_transition_kind is not null or
    (
      visibility = 'draft' and
      snapshot_revision is null
    ) or
    (
      visibility in (
        'workspace',
        'public'
      ) and
      snapshot_revision is not null
    )
  ),
  constraint dashboards__snapshot_transition_consistent check (
    (
      snapshot_transition_kind is null and
      snapshot_transition_revision is null and
      snapshot_transition_prior_revision is null and
      snapshot_transition_prior_visibility is null and
      snapshot_transition_target_visibility is null
    ) or
    (
      snapshot_transition_kind is not null and
      snapshot_transition_revision is not null and
      snapshot_transition_revision <> '00000000-0000-0000-0000-000000000000'::uuid and
      snapshot_transition_revision is distinct from snapshot_revision and
      snapshot_transition_prior_visibility is not null and
      (
        (
          snapshot_transition_kind in (
            'publish',
            'abort_publish'
          ) and
          snapshot_transition_target_visibility in (
            'workspace',
            'public'
          ) and
          visibility = snapshot_transition_prior_visibility and
          snapshot_revision is not distinct from snapshot_transition_prior_revision
        ) or
        (
          snapshot_transition_kind in (
            'unpublish',
            'delete'
          ) and
          snapshot_transition_target_visibility is null and
          visibility = 'draft' and
          snapshot_revision is not distinct from snapshot_transition_prior_revision
        )
      )
    )
  )
);

/** Whether an update preserves every snapshot boundary and transition field. */
create or replace function private.dashboards__snapshot_state_is_unchanged (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path = '' as $$
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
$$;

/** Whether a settled dashboard update acquires a valid transition claim. */
create or replace function private.dashboards__snapshot_claim_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path = '' as $$
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
$$;

/** Whether clearing an active transition commits or restores its boundary. */
create or replace function private.dashboards__snapshot_settlement_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path = '' as $$
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
      (p_old_dashboard).snapshot_transition_kind = 'unpublish' and
      (p_new_dashboard).visibility = 'draft' and
      (p_new_dashboard).snapshot_revision is null
    );
$$;

/** Whether an active transition update is a heartbeat, fence, or settlement. */
create or replace function private.dashboards__snapshot_progress_is_valid (
  p_old_dashboard public.dashboards,
  p_new_dashboard public.dashboards
) returns boolean language sql immutable
set
  search_path = '' as $$
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
$$;

/** Rejects snapshot boundary updates that bypass the durable transition. */
create or replace function private.dashboards__validate_snapshot_transition_update () returns trigger language plpgsql security definer
set
  search_path = '' as $$
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
$$;

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

revoke all on function private.dashboards__snapshot_progress_is_valid (
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

-- Enable row level security
-- RLS and policies: `17.rls.dashboards.sql`
-- (after `16.utils__permissions.sql` defines resource helper functions).
alter table public.dashboards enable row level security;

/** Prevents a dashboard from being reassigned to another workspace. */
create or replace function public.dashboards__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'dashboard workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tr__dashboards__prevent_workspace_id_change before
update of workspace_id on public.dashboards for each row
execute function public.dashboards__prevent_workspace_id_change ();

-- Trigger the `updated_at` update
create trigger tr_dashboards__set_updated_at before
update on public.dashboards for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_dashboards__slug on public.dashboards (slug);

create index idx_dashboards__workspace_owner on public.dashboards (
  workspace_id,
  owner_id
);

-- Vanity slugs live in two namespaces because they are served from two URLs.
--
-- Public dashboards resolve at `/d/<slug>` for an anonymous visitor who has no
-- workspace context, so their slugs must be globally unique.
create unique index dashboards__slug_unique_when_public on public.dashboards (slug)
where
  visibility = 'public'::public.dashboard_visibility and
  slug is not null;

-- Workspace-only dashboards resolve at `/<workspaceSlug>/d/<slug>`, so they
-- only need to be unique inside their workspace. Scoping them here rather than
-- globally stops a dashboard nobody outside the workspace can see from
-- squatting a name every other tenant then cannot use.
create unique index dashboards__slug_unique_per_workspace_when_internal on public.dashboards (
  workspace_id,
  slug
)
where
  visibility = 'workspace'::public.dashboard_visibility and
  slug is not null;
