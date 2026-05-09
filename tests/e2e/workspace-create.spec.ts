import { createSupabaseAdminClient } from "../helper/supabaseAdminClient";
import { expect, test } from "./fixtures/e2eTestWorkspace.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  SEEDED_WORKSPACE_MENU_BUTTON_NAME,
} from "./helpers/constants";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import { deletePrimaryUserE2EWorkspaceTreeBySlug } from "./setup/e2eTestWorkspaceLifecycle";

test.describe("workspace creation", () => {
  test("creates a new workspace from the navbar", async ({ page }) => {
    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    /**
     * Matches `slugify(workspaceName)` and stays within `SLUG_MAX_LENGTH`
     * (20).
     */
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    try {
      await signInWithEmailPassword(page, {
        email: E2E_TEST_USER.email,
        password: E2E_TEST_USER.password,
      });

      await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}`);

      await page
        .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
        .click();
      await page.getByRole("menuitem", { name: "Create Workspace" }).click();

      const dialog = page.getByRole("dialog");

      const slugValidResponsePromise = page.waitForResponse(
        (response) => {
          return (
            response.request().method() === "POST" &&
            response.url().includes("validate-slug") &&
            response.ok()
          );
        },
        { timeout: LONG_WAIT },
      );

      await dialog.getByLabel("Workspace Name").fill(workspaceName);
      await expect(dialog.getByLabel("Workspace ID")).toHaveValue(
        workspaceSlug,
        { timeout: SHORT_WAIT },
      );

      // ensure the slug is valid
      await slugValidResponsePromise;

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
        await deletePrimaryUserE2EWorkspaceTreeBySlug({
          admin,
          slug: workspaceSlug,
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
