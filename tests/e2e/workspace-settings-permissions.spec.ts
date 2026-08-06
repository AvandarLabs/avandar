import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { LONG_WAIT } from "./helpers/timeouts";

test.describe("workspace settings permissions smoke", () => {
  test("global admin still sees workspace user management controls", async ({
    page,
    e2eWorkerDb,
  }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/settings`);
    await page.getByRole("tab", { name: "Members" }).click();

    await expect(
      page.getByRole("button", { name: "Invite member" }),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect(
      page.getByRole("columnheader", { name: "Name" }),
    ).toBeVisible();
  });
});
