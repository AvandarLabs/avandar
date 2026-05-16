import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { LONG_WAIT } from "./helpers/timeouts";

test.describe("workspace settings access (non-settings admin)", () => {
  test("Global Viewer sees Access denied on settings, not settings tabs", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    void e2eViewerMembership;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.secondaryUser.email,
      password: e2eWorkerDb.secondaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/settings`);

    await expect(page).toHaveURL(
      new RegExp(`/${e2eWorkerDb.workspaceSlug}/settings`),
      { timeout: LONG_WAIT },
    );

    await expect(
      page.getByRole("heading", { name: "Access denied" }),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect(
      page.getByText(
        "Only workspace settings administrators can open workspace settings.",
      ),
    ).toBeVisible();

    await expect(page.getByRole("tab", { name: "General" })).toHaveCount(0);
  });
});
