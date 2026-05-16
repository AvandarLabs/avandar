import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { LONG_WAIT } from "./helpers/timeouts";

export { expect };

/**
 * Resolves Supabase HTTP URL for browser-style clients.
 */
function _getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_API_URL;

  if (!url) {
    throw new Error("SUPABASE_URL or VITE_SUPABASE_API_URL is required.");
  }

  return url;
}

/**
 * "Matrix" here means a grid of permission checks: each row is an actor
 * (e.g. workspace owner vs viewer) and each column is a surface or action
 * (browser vs anon-key API). Each cell asserts allow vs deny under RLS. This
 * file is expected to grow more rows/columns over time; it currently encodes
 * a small subset of that grid.
 */
test.describe("permissions RLS matrix (owner vs viewer)", () => {
  test("owner reaches data manager; viewer cannot update workspace via API", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { admin, workspaceId } = e2eViewerMembership;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager`);

    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/data-manager`),
      { timeout: LONG_WAIT },
    );

    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!anonKey) {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY is required for viewer API test.",
      );
    }

    const viewerClient = createClient(_getSupabaseUrl(), anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signInError } = await viewerClient.auth.signInWithPassword({
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
    });

    if (signInError) {
      throw new Error(`viewer sign-in failed: ${signInError.message}`);
    }

    const { data: workspaceBefore, error: readBeforeError } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (readBeforeError || !workspaceBefore) {
      throw new Error(
        `[e2e] workspace read failed: ${readBeforeError?.message ?? "no row"}`,
      );
    }

    const { data: updateRows, error: updateError } = await viewerClient
      .from("workspaces")
      .update({ name: "should-not-apply" })
      .eq("id", workspaceId)
      .select("id");

    expect(updateError ?? null).toBeNull();
    expect(updateRows ?? []).toEqual([]);

    const { data: workspaceAfter, error: readAfterError } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();

    if (readAfterError || !workspaceAfter) {
      throw new Error(
        `[e2e] workspace re-read failed: ${readAfterError?.message ?? "no row"}`,
      );
    }

    expect(workspaceAfter.name).toBe(workspaceBefore.name);
  });
});
