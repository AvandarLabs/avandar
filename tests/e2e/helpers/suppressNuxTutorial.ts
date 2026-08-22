import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { getUserIdByEmail } from "../setup/e2eTestWorkspaceLifecycle";
import { createSupabaseAdminClient } from "./supabaseAdminClient";

/**
 * Takes an e2e user out of the onboarding tutorial entirely.
 *
 * The seeded e2e user owns their workspace, so they are exactly who the
 * tutorial targets, and its chrome gets in the way of every other spec in two
 * separate ways:
 *
 * 1. The welcome invite is a modal overlay that swallows clicks meant for the
 *    page behind it.
 * 2. The checklist panel renders a button per milestone, with accessible names
 *    like "Share it with your workspace". That makes a loose selector such as
 *    `getByRole("button", { name: "Share" })` ambiguous, which is a strict-mode
 *    violation in specs that predate the tutorial.
 *
 * Hence `dismissed` rather than `in_progress`: it is the one status that
 * renders nothing at all. Suppressing at the data layer rather than clicking
 * the modal away also keeps every spec's timing unchanged, which matters
 * because some of them assert on auto-dismissing toasts.
 *
 * The tutorial's own spec resets this row to `not_started` and exercises the
 * whole thing for real, so nothing here is left untested.
 */
export async function suppressNuxTutorialForUser(email: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  // The `util__get_user_id_by_email` RPC behind this helper is an exact lookup.
  // `auth.admin.listUsers()` would return only its first page of 50, so the
  // seeded user would silently go missing on any database with more auth users
  // than that, and the failure would surface here as "no user for <email>".
  const userId = await getUserIdByEmail({ supabaseAdminClient: admin, email });

  const { error } = await admin.from("user_nux_progress").upsert(
    {
      user_id: userId,
      tutorial_key: NuxProgress.firstDashboardTutorialKey,
      status: "dismissed",
      completed_milestones: [],
    },
    { onConflict: "user_id,tutorial_key" },
  );
  if (error) {
    throw new Error(`[e2e] nux tutorial suppression: ${error.message}`);
  }
}
