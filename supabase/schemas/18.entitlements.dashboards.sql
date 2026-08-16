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
 * Mirrored in TypeScript by the count in `hasSubscriptionPermission`; the two
 * are pinned by pgTAP and by vitest respectively.
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
