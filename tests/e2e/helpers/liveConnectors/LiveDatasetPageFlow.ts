import { expect } from "@playwright/test";
import { LONG_WAIT } from "../timeouts";
import type { LiveConnectorE2e } from "./LiveConnectorE2e.types";
import type { Locator, Page } from "@playwright/test";

type ExpectColumnSummaryOptions = {
  page: Page;
  columnName: string;
  typeLabel: string;
  expectedFigure: string;
};

async function _expectColumnSummary(
  options: Readonly<ExpectColumnSummaryOptions>,
): Promise<void> {
  const { page, columnName } = options;
  const section = page.locator("section").filter({
    has: page.getByRole("heading", { name: columnName, exact: true }),
  });
  // Sections load their summary only once scrolled near the viewport.
  await section.scrollIntoViewIfNeeded();
  await expect(section).toContainText(options.typeLabel);
  await expect(section).toContainText(options.expectedFigure, {
    timeout: LONG_WAIT,
  });
  await expect(section).not.toContainText("Could not summarize");
}

async function _refreshFromSource(
  options: Readonly<{ page: Page; connector: LiveConnectorE2e }>,
): Promise<void> {
  const { page, connector } = options;
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page
    .getByRole("menuitem", { name: connector.refreshMenuItemName })
    .click();
  await expect(
    page.getByText(connector.refreshedNotificationTitle),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/** Reads and refreshes a live dataset from its dataset page. */
export const LiveDatasetPageFlow = {
  /**
   * The grid cell showing a whole number. The grids render one with two
   * decimal places, so `450` shows as `450.00`.
   */
  getWholeNumberCell: (
    options: Readonly<{ page: Page; value: number }>,
  ): Locator => {
    return options.page.getByRole("gridcell", {
      name: new RegExp(`^${options.value}(\\.0+)?$`),
    });
  },

  /**
   * Asserts a column's Data Summary section, on the open Data Summary tab,
   * shows its type label and `expectedFigure`, and that its summary query
   * did not fail.
   */
  expectColumnSummary: _expectColumnSummary,

  /**
   * Re-reads the dataset's source through its dataset page's actions menu,
   * and waits for the refresh to finish.
   */
  refreshFromSource: _refreshFromSource,
};
