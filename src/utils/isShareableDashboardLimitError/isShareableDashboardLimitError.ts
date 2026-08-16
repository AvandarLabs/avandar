/**
 * The `hint` that `private.dashboards__assert_shareable_within_limit` raises
 * with, declared in `supabase/schemas/18.entitlements.dashboards.sql`.
 *
 * A contract with the database, pinned there by
 * `supabase/tests/database/dashboards/shareable_entitlement_triggers.test.sql`
 * and here by this module's test. Changing the string means changing all
 * three.
 */
const SHAREABLE_DASHBOARD_LIMIT_HINT = "shareable_dashboard_limit";

/**
 * Whether a thrown error is the database refusing a write because the
 * workspace has spent its shareable-dashboard allowance.
 *
 * Matches on PostgREST's `hint` rather than on the SQLSTATE or the message.
 * `42501` alone would be wrong, because several other policies raise it, and
 * the message alone would be wrong because it is user-facing copy that will be
 * reworded. The hint is the only part of the rejection that exists purely to
 * be matched on.
 *
 * Two callers, deliberately sharing one definition. The share path can hit
 * this trigger with no gate in front of it at all, and the publish path's gate
 * is optimistic while its permission query is in flight, so both need to
 * recognise the same rejection and neither should restate the rule.
 *
 * Structural rather than `instanceof PostgrestError`: the error crosses
 * several layers of client code that may rethrow or wrap it, and the shape is
 * what supabase-js actually puts on the wire.
 */
export function isShareableDashboardLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { hint?: unknown }).hint === SHAREABLE_DASHBOARD_LIMIT_HINT
  );
}
