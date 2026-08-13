import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./helpers/constants";
import { dismissBillingModalIfVisible } from "./helpers/dismissBillingModal";
import {
  createE2ESupabaseViewerClient,
  getSupabaseAnonKeyFromEnv,
  getSupabaseUrlFromEnv,
} from "./helpers/supabase";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
  WORKSPACES_STORAGE_BUCKET,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";
import { ensureWorkspaceSubscriptionForE2E } from "./setup/ensureWorkspaceSubscriptionForE2E";
import type { Response } from "@playwright/test";

/**
 * Throws with HTTP status and body when `workspaces/validate-slug` does not
 * succeed, so timeouts vs 4xx/5xx are distinguishable in CI logs.
 */
async function _assertSlugResponseOk(response: Response): Promise<void> {
  if (response.ok()) {
    return;
  }

  let bodySnippet: string;
  try {
    const text = await response.text();
    bodySnippet = text.length > 800 ? `${text.slice(0, 800)}…` : text;
  } catch {
    bodySnippet = "(could not read response body)";
  }

  throw new Error(
    `workspaces/validate-slug request failed: HTTP ${response.status()} ${response.statusText()}. Response body: ${bodySnippet}`,
  );
}

test.describe("workspace deletion", () => {
  /**
   * The delete endpoint's owner-only guard lives on the server: a member who
   * is not the owner never sees the delete UI, so the only way to exercise it
   * is to call the endpoint directly as a non-owner member. The Global Viewer
   * fixture makes the secondary user a member (so RLS lets them read the
   * workspace row and the owner check is what rejects them, not RLS).
   *
   * NOTE: the guard throws `AvaHTTPError(FORBIDDEN)`, but the response status
   * is 401, not 403, because `authMiddleware` currently collapses every
   * handler error to 401 (see https://github.com/AvandarLabs/avandar/issues/267).
   * We assert the current behavior plus the owner-only message so this still
   * proves the guard fired; tighten to 403 once #267 is fixed.
   */
  test("rejects a non-owner member", async ({
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const viewerClient = await createE2ESupabaseViewerClient({
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
    });
    const {
      data: { session },
    } = await viewerClient.auth.getSession();
    expect(session, "viewer session should exist after sign-in").not.toBeNull();

    const response = await fetch(
      `${getSupabaseUrlFromEnv()}/functions/v1/workspaces/${e2eViewerMembership.workspaceId}/delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: getSupabaseAnonKeyFromEnv(),
          "Content-Type": "application/json",
        },
        // The MiniServer parses a JSON body on every POST, so an empty body
        // makes it throw before the owner check runs. Mirror what the app's
        // APIClient.post sends (an empty object) for a body-less route.
        body: JSON.stringify({}),
      },
    );

    // 401 (not 403) is the current behavior - see issue #267. The message
    // proves the owner-only guard is what rejected the call, not a generic
    // auth failure.
    expect(response.status).toBe(401);
    const responseBody = (await response.json()) as { error?: string };
    expect(responseBody.error).toContain(
      "Only the workspace owner can delete a workspace",
    );

    // The workspace must still exist after the rejected call.
    const admin = createSupabaseAdminClient();
    const { data: workspaceRow } = await admin
      .from("workspaces")
      .select("id")
      .eq("id", e2eViewerMembership.workspaceId)
      .maybeSingle();
    expect(workspaceRow?.id).toBe(e2eViewerMembership.workspaceId);
  });

  /**
   * Owner path through the UI: create a workspace, seed a nested storage tree,
   * then delete it via the danger zone. Covers the exact-name confirmation
   * (including the trailing whitespace the input trims), the redirect home once
   * it is gone, and the recursive storage purge (top-level files plus a nested
   * subfolder - the level that was silently dropped before).
   */
  test("owner confirms the name, is redirected, and nested storage is purged", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    // Matches `slugify(workspaceName)` and stays within `SLUG_MAX_LENGTH` (20).
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      // Create the workspace we will then delete.
      await page.goto(`/${e2eWorkerDb.workspaceSlug}`);
      await page
        .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
        .click();
      await page.getByRole("menuitem", { name: "Create Workspace" }).click();

      const dialog = page.getByRole("dialog");
      const slugValidationResponsePromise = page.waitForResponse(
        (response) => {
          return (
            response.request().method() === "POST" &&
            response.url().includes("validate-slug")
          );
        },
        { timeout: LONG_WAIT },
      );

      await dialog.getByLabel("Workspace Name").fill(workspaceName);
      await expect(dialog.getByLabel("Workspace ID")).toHaveValue(
        workspaceSlug,
        { timeout: SHORT_WAIT },
      );
      await _assertSlugResponseOk(await slugValidationResponsePromise);

      await dialog.getByLabel("Full Name").fill("E2E Tester");
      await dialog.getByLabel("Display Name").fill("E2E Tester");
      await expect(dialog.getByRole("button", { name: "Submit" })).toBeEnabled({
        timeout: LONG_WAIT,
      });
      await dialog.getByRole("button", { name: "Submit" }).click();
      await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
        timeout: LONG_WAIT,
      });

      // The UI create flow does not leave the workspace with a valid
      // subscription in the E2E environment, so without this the settings
      // route redirects to /invalid-workspace (NO_SUBSCRIPTION) and the
      // danger zone never renders. Seed a native-free subscription the same
      // way the worker fixture does for the shared workspace.
      await ensureWorkspaceSubscriptionForE2E({
        workspaceSlug,
        polarCustomerEmail: e2eWorkerDb.primaryUser.email,
      });

      // Seed storage under the workspace prefix so deletion must purge both
      // top-level files AND a nested subfolder. The nested object is what
      // exercises the recursive walk in listWorkspaceStorageFilePaths - the
      // level that was silently left behind before.
      const admin = createSupabaseAdminClient();
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      const seededObjectPaths = [
        `${workspaceId}/root-a.txt`,
        `${workspaceId}/root-b.txt`,
        `${workspaceId}/datasets/nested.txt`,
      ];
      await Promise.all(
        seededObjectPaths.map(async (objectPath) => {
          const { error: uploadError } = await admin.storage
            .from(WORKSPACES_STORAGE_BUCKET)
            .upload(objectPath, new Blob(["e2e"], { type: "text/plain" }), {
              upsert: true,
            });
          expect(uploadError, `seed upload ${objectPath}`).toBeNull();
        }),
      );

      // Open the danger zone on the General settings tab.
      await page.goto(`/${workspaceSlug}/settings/general`);
      await dismissBillingModalIfVisible(page);
      await page.getByRole("button", { name: "Delete workspace" }).click();

      const deleteDialog = page.getByRole("dialog");
      const confirmInput = deleteDialog.getByLabel(
        "Type the workspace name to confirm",
      );
      const confirmButton = deleteDialog.getByRole("button", {
        name: "Delete workspace",
      });

      // Wrong name keeps the button disabled.
      await confirmInput.fill("not the name");
      await expect(confirmButton).toBeDisabled();

      // The exact name with surrounding whitespace is trimmed, so it still
      // enables the button.
      await confirmInput.fill(`  ${workspaceName}  `);
      await expect(confirmButton).toBeEnabled();

      await confirmButton.click();

      // Redirected away from the deleted workspace once it is gone. Home ("/")
      // may itself resolve to another workspace, so the stable invariant is
      // that we no longer sit on the deleted slug.
      await expect(page).not.toHaveURL(new RegExp(`/${workspaceSlug}(/|$)`), {
        timeout: LONG_WAIT,
      });

      // The workspace row is actually deleted.
      const { data: workspaceRow } = await admin
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .maybeSingle();
      expect(workspaceRow).toBeNull();

      // Every seeded object must be gone, including the nested one - proof the
      // recursive walk ran, not just the top level.
      const countObjectsUnder = async (prefix: string): Promise<number> => {
        const { data } = await admin.storage
          .from(WORKSPACES_STORAGE_BUCKET)
          .list(prefix, { limit: 1000 });
        return data?.length ?? 0;
      };
      await expect
        .poll(
          () => {
            return countObjectsUnder(workspaceId);
          },
          { timeout: SHORT_WAIT },
        )
        .toBe(0);
      await expect
        .poll(
          () => {
            return countObjectsUnder(`${workspaceId}/datasets`);
          },
          { timeout: SHORT_WAIT },
        )
        .toBe(0);
    } finally {
      // Best-effort cleanup in case the test failed before deletion.
      try {
        const admin = createSupabaseAdminClient();
        await deleteUserOwnedWorkspaceTreeBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
          ownerEmail: e2eWorkerDb.primaryUser.email,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[e2e] workspace-delete cleanup (${workspaceSlug}): ${message}`,
        );
      }
    }
  });
});
