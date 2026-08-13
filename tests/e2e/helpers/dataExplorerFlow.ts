import { expect } from "@playwright/test";
import { MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";

/** Tabs of the Data Explorer's bottom drawer. */
type DataExplorerDrawerTab = "query" | "visualizations";

/** Matches each tab's accessible name, for both its tab and its panel. */
const DRAWER_TAB_NAME_PATTERNS: Record<DataExplorerDrawerTab, RegExp> = {
  query: /^query$/i,
  visualizations: /^visualizations$/i,
};

/**
 * Closes Mantine drawers/overlays (e.g. Data Explorer "Open") that block
 * toolbar clicks in Playwright.
 */
export async function dismissBlockingOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

/**
 * The drawer's collapse chevron, whose `aria-expanded` is the one signal that
 * distinguishes a shut drawer from one that has not rendered yet.
 */
export function dataExplorerDrawerToggle(page: Page): Locator {
  return page.getByRole("button", { name: /drawer$/i });
}

/**
 * Opens the Data Explorer's bottom drawer on `tab` by clicking that tab's
 * label, and settles on the panel being visible.
 *
 * The drawer opens shut and mounts no panel until first opened, so every
 * control it holds (the query editor, the visualization type picker in the
 * rail) is absent from the DOM until this runs. A spec that reaches for one of
 * them without opening the drawer waits out its whole timeout.
 */
export async function openDataExplorerDrawerTab({
  page,
  tab,
}: {
  page: Page;
  tab: DataExplorerDrawerTab;
}): Promise<void> {
  // Gate on the chevron rather than the panel: the panel locator matches
  // nothing both while the drawer is shut and before it has rendered at all,
  // so it cannot tell a collapsed drawer from an absent one.
  const toggle = dataExplorerDrawerToggle(page);
  await expect(toggle).toBeVisible({ timeout: MEDIUM_WAIT });

  // Clicking the already-selected tab still opens the drawer: Mantine re-fires
  // `onChange` for it, which the drawer treats as a request to open.
  const tabName = DRAWER_TAB_NAME_PATTERNS[tab];
  await page.getByRole("tab", { name: tabName }).click();

  await expect(toggle).toHaveAttribute("aria-expanded", "true", {
    timeout: SHORT_WAIT,
  });
  await expect(page.getByRole("tabpanel", { name: tabName })).toBeVisible({
    timeout: SHORT_WAIT,
  });
}
