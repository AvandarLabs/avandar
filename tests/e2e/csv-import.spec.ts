import { expect, test } from "@playwright/test";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_CSV_PATH,
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  EXPECTED_CSV_COLUMN_NAMES,
} from "./helpers/constants";

test.describe("CSV manual upload", () => {
  test("parses the California COVID sample with DuckDB WASM preview", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(CALIFORNIA_CSV_PATH);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: 120_000 });

    const formattedRowCount =
      CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
    await expect(
      page.getByText(`Parsed ${formattedRowCount} rows successfully`),
    ).toBeVisible();

    await expect(page.getByText(/These are the first \d+ rows/)).toBeVisible();

    for (const columnName of EXPECTED_CSV_COLUMN_NAMES) {
      await expect(
        page.getByRole("columnheader", { name: columnName }),
      ).toBeVisible();
    }

    await expect(page.getByText("California").first()).toBeVisible();
  });
});
