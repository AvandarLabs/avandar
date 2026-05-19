import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { ensureCloudStorageCheckedAndSaveDataset } from "./helpers/manualUploadCloudSyncFlow";
import { MEDIUM_WAIT } from "./helpers/timeouts";

test.describe("Share resource modal", () => {
  test("opens share modal after CSV upload without map error", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(240_000);

    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await ensureCloudStorageCheckedAndSaveDataset({
      page,
      workspaceSlug,
    });

    await page.screenshot({
      path: "/tmp/playwright-share-bug-screenshots/03-dataset-meta-saved.png",
      fullPage: true,
    });

    const shareButton = page.getByRole("button", { name: "Share" });
    await expect(shareButton).toBeEnabled({ timeout: MEDIUM_WAIT });
    await shareButton.click();

    await page.screenshot({
      path: "/tmp/playwright-share-bug-screenshots/04-after-share-click.png",
      fullPage: true,
    });

    await expect(
      page.getByText(/Cannot read properties of undefined/i),
    ).not.toBeVisible();

    // Anchor on the unified Add combobox and the "General access" select.
    await expect(
      page.getByRole("combobox", { name: "Add people, groups, or tags" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(
      page.getByRole("combobox", { name: "General access" }),
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
