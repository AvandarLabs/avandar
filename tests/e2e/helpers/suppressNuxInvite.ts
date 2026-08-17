import { FIRST_DASHBOARD_TUTORIAL_KEY } from "$/models/Nux/NuxProgress.constants";
import { createSupabaseAdminClient } from "./supabaseAdminClient";

/**
 * Pre-answers the onboarding tutorial's invite for an e2e user.
 *
 * The seeded e2e user owns their workspace, so they are exactly who the
 * tutorial invites, and the invite is a modal overlay that swallows clicks
 * meant for the page behind it.
 *
 * Suppressing at the data layer rather than dismissing it in the browser is
 * deliberate. Dismissing works, but it costs every spec a modal appearing and
 * being clicked away mid-run, and that delay is enough to make assertions on
 * auto-dismissing toasts miss their window. Seeding `in_progress` means the
 * invite is simply never shown: no overlay, no extra clicks, no timing shift.
 *
 * `in_progress` rather than `dismissed`, so the checklist pill still renders.
 * Specs should see the app as a real owner sees it; only the blocking modal is
 * removed.
 *
 * The tutorial's own spec resets this row back to `not_started` so it can
 * exercise the invite for real.
 */
export async function suppressNuxInviteForUser(email: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: users, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`[e2e] nux invite suppression: ${listError.message}`);
  }

  const user = users.users.find((candidate) => {
    return candidate.email === email;
  });
  if (!user) {
    throw new Error(`[e2e] nux invite suppression: no user for ${email}`);
  }

  const { error } = await admin.from("user_nux_progress").upsert(
    {
      user_id: user.id,
      tutorial_key: FIRST_DASHBOARD_TUTORIAL_KEY,
      status: "in_progress",
      completed_milestones: [],
    },
    { onConflict: "user_id,tutorial_key" },
  );
  if (error) {
    throw new Error(`[e2e] nux invite suppression: ${error.message}`);
  }
}
