import { expect, test } from "@playwright/test";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  SEEDED_WORKSPACE_MENU_BUTTON_NAME,
} from "./helpers/constants";

test.describe("workspace creation", () => {
  test("creates a new workspace from the navbar", async ({ page }) => {
    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}`);

    await page
      .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
      .click();
    await page.getByRole("menuitem", { name: "Create Workspace" }).click();

    const uniqueSuffix = Date.now().toString(36);
    const workspaceName = `E2E Org ${uniqueSuffix}`;
    /**
     * Matches `slugify(workspaceName)` and stays within `SLUG_MAX_LENGTH`
     * (20).
     */
    const workspaceSlug = `e2e-org-${uniqueSuffix}`;

    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Workspace Name").fill(workspaceName);
    await expect(dialog.getByLabel("Workspace ID")).toHaveValue(workspaceSlug, {
      timeout: 20_000,
    });

    const workspaceIdInput = dialog.getByLabel("Workspace ID");
    await workspaceIdInput.fill("");
    await workspaceIdInput.fill(workspaceSlug);

    await dialog.getByLabel("Full Name").fill("E2E Tester");
    await dialog.getByLabel("Display Name").fill("E2E Tester");

    await expect(dialog.getByRole("button", { name: "Submit" })).toBeEnabled({
      timeout: 30_000,
    });

    await dialog.getByRole("button", { name: "Submit" }).click();

    await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
      timeout: 60_000,
    });
  });
});
