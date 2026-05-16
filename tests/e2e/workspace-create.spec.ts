import { createSupabaseAdminClient } from "../helpers/supabaseAdminClient";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./helpers/constants";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import { deleteUserOwnedWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";
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
    `workspaces/validate-slug request failed: 
  HTTP ${response.status} ${response.statusText}.
  Response body:
  ${bodySnippet}`,
  );
}

test.describe("workspace creation", () => {
  test("creates a new workspace from the navbar", async ({
    page,
    e2eWorkerDb,
  }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    /**
     * Matches `slugify(workspaceName)` and stays within `SLUG_MAX_LENGTH`
     * (20).
     */
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

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

      let slugValidationResponse: Response;
      try {
        slugValidationResponse = await slugValidationResponsePromise;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Timed out after ${LONG_WAIT}ms waiting for POST workspaces/validate-slug.
The debounced request may not have fired, the URL may differ, or the server hung.
${detail}`,
        );
      }

      await _assertSlugResponseOk(slugValidationResponse);

      await dialog.getByLabel("Full Name").fill("E2E Tester");
      await dialog.getByLabel("Display Name").fill("E2E Tester");

      await expect(dialog.getByRole("button", { name: "Submit" })).toBeEnabled({
        timeout: LONG_WAIT,
      });

      await dialog.getByRole("button", { name: "Submit" }).click();

      await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
        timeout: LONG_WAIT,
      });
    } finally {
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
          `[e2e] workspace-create cleanup (${workspaceSlug}): ${message}`,
        );
      }
    }
  });
});
