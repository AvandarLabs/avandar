import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";

/**
 * Drive `useIsOnline` without cutting dev server network (avoids blank HMR).
 */
async function emulateBrowserOffline(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    window.dispatchEvent(new Event("offline"));
  });
}

test.describe("web read-only offline mode", () => {
  test("shows offline banner and blocks import while offline", async ({
    page,
    e2eWorkerDb,
  }) => {
    await page.route("**/functions/v1/chat/*/messages", async (route) => {
      if (route.request().method() === "POST") {
        await route.abort("failed");
      } else {
        await route.continue();
      }
    });

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager/data-import`);
    await expect(page.getByRole("alert")).toHaveCount(0);

    await emulateBrowserOffline(page);

    await expect(
      page.getByRole("alert").filter({ hasText: /You are offline/i }),
    ).toBeVisible();

    const saveDatasetButton = page.getByRole("button", {
      name: "Save Dataset",
    });
    if (await saveDatasetButton.isVisible()) {
      await expect(saveDatasetButton).toBeDisabled();
    }
  });
});
