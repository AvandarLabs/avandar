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
