import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { LONG_WAIT } from "./helpers/timeouts";

test.describe("Dashboards — create via UI", () => {
  test("workspace admin can create a dashboard from the empty state", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/dashboards`);

    await page
      .getByRole("button", { name: "Create a dashboard" })
      .first()
      .click();

    await expect(page).toHaveURL(
      new RegExp(`/${workspaceSlug}/dashboards/edit/`),
      { timeout: LONG_WAIT },
    );
  });
});
