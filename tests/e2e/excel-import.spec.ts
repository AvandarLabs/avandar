import { expect, test } from "@playwright/test";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_XLSX_PATH,
  CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT,
  CHOLERA_NYC_XLSX_PATH,
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  EXPECTED_CHOLERA_COLUMN_NAMES,
  EXPECTED_CSV_COLUMN_NAMES,
} from "./helpers/constants";
import type { Page } from "@playwright/test";

/**
 * Asserts Excel manual-upload preview: parse callout, row count, preview grid,
 * and an optional sample cell substring visible in the table.
 */
async function expectExcelParsePreview(options: {
  page: Page;
  formattedRowCount: string;
  columnNames: readonly string[];
  sampleCellSubstring: string;
}): Promise<void> {
  await expect(
    options.page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: 120_000 });

  await expect(
    options.page.getByText(
      `Parsed ${options.formattedRowCount} rows successfully`,
    ),
  ).toBeVisible();

  await expect(
    options.page.getByText(/These are the first \d+ rows/),
  ).toBeVisible();

  for (const columnName of options.columnNames) {
    await expect(
      options.page.getByRole("columnheader", { name: columnName }),
    ).toBeVisible();
  }

  await expect(
    options.page.getByText(options.sampleCellSubstring).first(),
  ).toBeVisible();
}

test.describe("Excel manual upload", () => {
  test("imports cholera NYC linelist XLSX then California COVID XLSX", async ({
    page,
  }) => {
    test.setTimeout(360_000);

    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    const fileInput = uploadPanel.locator('input[type="file"]');
    const uploadSubmitButton = uploadPanel.getByRole("button", {
      name: "Upload",
      exact: true,
    });

    await fileInput.setInputFiles(CHOLERA_NYC_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount:
        CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT.toLocaleString("en-US"),
      columnNames: EXPECTED_CHOLERA_COLUMN_NAMES,
      sampleCellSubstring: "Times Square",
    });

    await fileInput.setInputFiles(CALIFORNIA_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount:
        CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US"),
      columnNames: EXPECTED_CSV_COLUMN_NAMES,
      sampleCellSubstring: "California",
    });
  });
});
