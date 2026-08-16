/**
 * The `hint` that `private.dashboards__assert_shareable_within_limit` raises
 * with, declared in `supabase/schemas/18.entitlements.dashboards.sql` and
 * pinned by `shareable_entitlement_triggers.test.sql` and this module's test.
 */
const SHAREABLE_DASHBOARD_LIMIT_HINT = "shareable_dashboard_limit";

/**
 * Whether a thrown error is the database refusing a write because the
 * workspace has spent its shareable-dashboard allowance.
 *
 * Do not match on the SQLSTATE or the message instead: several other policies
 * also raise `42501`, and the message is user-facing copy that gets reworded.
 *
 * The check is structural rather than `instanceof PostgrestError` because the
 * error crosses layers of client code that may rethrow or wrap it.
 */
export function isShareableDashboardLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { hint?: unknown }).hint === SHAREABLE_DASHBOARD_LIMIT_HINT
  );
}
