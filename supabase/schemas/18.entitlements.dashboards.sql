/**
 * Whether a dashboard counts against
 * `subscriptions.max_shareable_dashboards_allowed`.
 *
 * A dashboard counts when somebody other than its owner can reach it:
 *
 *   draft                        -> no, nobody outside its editors can open it
 *   workspace + private to owner -> no, every non-owner share was revoked
 *   workspace + shared           -> yes
 *   public                       -> yes, ALWAYS
 *
 * The unconditional `public` arm is load-bearing. A public dashboard is
 * world-readable through the anon policy regardless of its share rows, so
 * letting `is_restricted` hide it from the count would let a free workspace
 * publish unlimited dashboards to the open internet. See the umbrella design
 * section 4.2.
 *
 * Mirrored in TypeScript by `countShareableDashboards` in
 * `shared/models/Dashboard/countShareableDashboards/countShareableDashboards.ts`,
 * which is what the `can_publish_shareable_dashboard` branch of the
 * subscriptions edge function calls. The two definitions exist because Postgres
 * cannot call TypeScript; they are pinned by pgTAP and by vitest respectively,
 * and a change to either arm of the table above must be made in both.
 *
 * @returns False for an unknown id, so a deleted row is never counted.
 */
create or replace function public.util__dashboard_counts_as_shareable (
  p_dashboard_id uuid
) returns boolean language sql security definer stable
set
  search_path = public as $$
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
$$;

-- Internal helper for the entitlement triggers. Clients answer "may I publish?"
-- through the TypeScript entitlement code, never by calling this directly.
revoke
execute on function public.util__dashboard_counts_as_shareable (uuid)
from
  public,
  anon,
  authenticated;

/**
 * The workspace's effective shareable-dashboard cap, or null for unlimited.
 *
 * Two values here are duplicated from TypeScript because Postgres cannot call
 * into it. Both are pinned by pgTAP, and both must be changed in step:
 *
 *   ('active', 'trialing') mirrors
 *     SubscriptionModule.doesSubscriptionGrantEntitlements
 *   the literal 1 mirrors
 *     FreePlanLimitsConfig.maxShareableDashboardsAllowed
 *     in shared/config/FeaturePlansConfig.ts
 *
 * Any status outside that pair collapses to the free limit rather than reading
 * the stored column. A lapsed paid row still carries
 * `max_shareable_dashboards_allowed = null`, meaning unlimited, so reading it
 * directly would grant unlimited publishing to a workspace that stopped paying.
 *
 * A missing subscription row resolves to the free limit rather than to a
 * denial. Denying would break any path that creates a workspace before its
 * subscription row, and it would make this trigger stricter than
 * `getEffectiveEntitlementLimits`, which is the function that already answers
 * "what limits apply".
 *
 * @returns The cap, or null when the workspace may publish without limit.
 */
create or replace function public.util__workspace_max_shareable_dashboards (
  p_workspace_id uuid
) returns integer language plpgsql security definer stable
set
  search_path = public as $$
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
$$;

-- Internal helper for the entitlement triggers, and a `security definer` read
-- of a billing row the caller may not be able to select. Clients learn their
-- limits through `getEffectiveEntitlementLimits`, never by calling this.
revoke
execute on function public.util__workspace_max_shareable_dashboards (uuid)
from
  public,
  anon,
  authenticated;

/**
 * Raises when the workspace has already spent its shareable-dashboard
 * allowance on dashboards OTHER than `p_dashboard_id`.
 *
 * Shared by both enforcement triggers so the publish path and the share path
 * can never disagree about what the limit means. Returns without raising in
 * three cases:
 *
 *   - the caller is not an end user (see the exemption below)
 *   - the dashboard's new state does not count as shareable, which is what
 *     makes narrowing always legal. Unpublishing, unsharing and making a
 *     dashboard private stay available to a workspace that is already over its
 *     cap, so a workspace that published freely before this existed always has
 *     a way back under the limit
 *   - the cap is null, meaning unlimited
 *
 * The count EXCLUDES the dashboard being modified. That exclusion is the whole
 * reason republishing, renaming and adding a second reader to an
 * already-counting dashboard stay free: without it a free workspace could
 * publish its one allowed dashboard and then never save it again.
 *
 * SECURITY DEFINER because the count has to see every dashboard in the
 * workspace. Read through the caller's own RLS it would silently miss another
 * member's restricted-but-shared dashboard, undercount, and wave the write
 * through.
 */
create or replace function private.dashboards__assert_shareable_within_limit (
  p_dashboard_id uuid
) returns void language plpgsql security definer
set
  search_path = public as $$
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
    raise exception
      'This workspace''s plan allows % shared or public dashboard(s)', v_max
    using errcode = '42501';
  end if;
end;
$$;

/**
 * Publish path: an UPDATE that makes a dashboard shareable.
 *
 * `after` rather than `before`, and that is load-bearing rather than
 * stylistic. `util__dashboard_counts_as_shareable` re-reads the dashboard row
 * from the table instead of taking it as an argument, so a `before` trigger
 * judges the row as it still is rather than as it is about to become. Both
 * triggers were rebuilt as `before` (returning NEW, since a `before` trigger
 * that returns null cancels the row) and
 * `shareable_entitlement_triggers.test.sql` was rerun: it gets the answer
 * backwards in both directions at once. Publishing a second dashboard on a free
 * plan stops being refused, because the guard still sees the draft; and six
 * narrowing cases, unpublishing among them, start raising, because the guard
 * still sees the published row it is in the middle of retracting. Raising from
 * an `after` trigger still aborts the whole statement.
 *
 * SECURITY DEFINER so that it can reach the guard, whose execute is revoked
 * from every role. The guard makes its own decision about the caller and does
 * not rely on this function's identity.
 */
create or replace function private.dashboards__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  perform private.dashboards__assert_shareable_within_limit (new.id);
  return null;
end;
$$;

/**
 * Share path: an INSERT or UPDATE on `resource_shares` that gives a published
 * dashboard, private to its owner until now, its first non-owner reader.
 *
 * Not an exotic bypass: it is a plain PostgREST write with no edge function
 * anywhere in front of it, and it makes a dashboard reachable by somebody
 * other than its owner exactly as a publish does. Without this second trigger
 * a free workspace could publish one dashboard to itself, keep it private, and
 * then hand it to the entire company for free.
 *
 * `after` for the same reason as the publish trigger: the privacy predicate
 * reads the share rows, so a `before` trigger would judge a state that does not
 * include the row being inserted.
 *
 * No DELETE trigger. Removing a share can only lower the count.
 */
create or replace function private.resource_shares__enforce_shareable_limit () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  if new.resource_type = 'dashboard'::public.resource_type then
    perform private.dashboards__assert_shareable_within_limit (new.resource_id);
  end if;

  return null;
end;
$$;

-- Internal to the enforcement triggers, which reach them through the trigger
-- machinery rather than through these grants. Left callable, the guard would be
-- a probe for another workspace's billing state and dashboard inventory.
revoke
execute on function private.dashboards__assert_shareable_within_limit (uuid)
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function private.dashboards__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

revoke
execute on function private.resource_shares__enforce_shareable_limit ()
from
  public,
  anon,
  authenticated,
  service_role;

-- `update of visibility, is_restricted` narrows the trigger to the statements
-- that can widen a dashboard's audience. `is_restricted` belongs in that list
-- because clearing it re-exposes the dashboard to every tag-based app role in
-- the workspace.
create trigger tr__dashboards__enforce_shareable_limit
after insert or
update of visibility,
is_restricted on public.dashboards for each row
execute function private.dashboards__enforce_shareable_limit ();

create trigger tr__resource_shares__enforce_shareable_limit
after insert or
update on public.resource_shares for each row
execute function private.resource_shares__enforce_shareable_limit ();
