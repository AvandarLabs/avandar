import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  deleteSeededCaseRecord,
  seedCaseRecord,
} from "./helpers/seedCaseRecord";
import {
  deleteSeededDashboard,
  seedDashboardWithTile,
} from "./helpers/seedDashboardWithTile";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

const DASHBOARD_NAME = "E2E measles";
const TILE_ID = "DataViz-e2e";
const TILE_PROMPT = "E2E cases per week";

/**
 * Waits until the `@` menu has finished searching and highlights the option
 * with the given name, so Enter or Shift+Enter picks that option.
 */
async function waitForHighlightedOption(
  page: Page,
  optionName: string,
): Promise<void> {
  await expect(page.getByRole("listbox")).not.toHaveAttribute(
    "aria-busy",
    "true",
    { timeout: MEDIUM_WAIT },
  );
  await expect(
    page.getByRole("option").filter({ hasText: optionName }).first(),
  ).toHaveAttribute("aria-selected", "true", { timeout: MEDIUM_WAIT });
}

/** The value of a card fact, found by its label. */
function getFactValue(card: Locator, label: string): Locator {
  return card
    .getByRole("term")
    .filter({ hasText: label })
    .locator("xpath=following-sibling::dd[1]");
}

test("a member links and embeds a dashboard and a tile in a case update, then opens the tile", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let conceptId: string | undefined;
  let dashboardId: string | undefined;
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const seededCase = await seedCaseRecord({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      caseTypeName: "Gadget spec case type",
      recordName: "Gadget spec record",
    });
    conceptId = seededCase.conceptId;
    const seededDashboard = await seedDashboardWithTile({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      dashboardName: DASHBOARD_NAME,
      tileId: TILE_ID,
      tilePrompt: TILE_PROMPT,
    });
    dashboardId = seededDashboard.dashboardId;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await page.goto(
      `/${workspaceSlug}/individual-manager/${seededCase.conceptId}/${seededCase.individualId}`,
    );
    await expect(page.getByText("No activity on this case yet")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Link the dashboard. The editing area is a textbox, and a combobox
    // while the @ menu is open, so it is located by its label. A space ends
    // the @ query, so each search is one word.
    const editor = page.getByLabel("Write an update", { exact: true });
    await editor.click();
    await page.keyboard.type("Compare @measles");
    await waitForHighlightedOption(page, DASHBOARD_NAME);
    await page.keyboard.press("Enter");
    const dashboardChip = editor.getByRole("button", { name: DASHBOARD_NAME });
    await expect(dashboardChip).toBeVisible({ timeout: MEDIUM_WAIT });

    // Switch the link to an embed from the chip's menu.
    await dashboardChip.click();
    await page.getByRole("menuitem", { name: "Show as embed" }).click();
    const editorDashboardCard = editor.getByRole("group", {
      name: DASHBOARD_NAME,
    });
    await expect(editorDashboardCard).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(getFactValue(editorDashboardCard, "Tiles")).toHaveText("1");

    // Embed the tile with Shift+Enter from the end of the first line.
    await editor.getByText("Compare").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" and @cases");
    await waitForHighlightedOption(page, TILE_PROMPT);
    await page.keyboard.press("Shift+Enter");
    await expect(editor.getByRole("group", { name: TILE_PROMPT })).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.getByRole("button", { name: "Post", exact: true }).click();

    // Both cards show in the posted update, with their facts.
    const comment = page.getByRole("article").filter({ hasText: "Compare" });
    await expect(comment).toBeVisible({ timeout: MEDIUM_WAIT });
    const feedDashboardCard = comment.getByRole("group", {
      name: DASHBOARD_NAME,
    });
    await expect(feedDashboardCard).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(getFactValue(feedDashboardCard, "Tiles")).toHaveText("1");
    await expect(getFactValue(feedDashboardCard, "Audience")).toHaveText(
      "Workspace",
    );
    const feedTileCard = comment.getByRole("group", { name: TILE_PROMPT });
    await expect(feedTileCard).toBeVisible();
    await expect(getFactValue(feedTileCard, "Dashboard")).toHaveText(
      DASHBOARD_NAME,
    );

    // Opening the tile lands on the dashboard preview at that tile.
    await feedTileCard
      .getByRole("link", { name: `Open ${TILE_PROMPT}` })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboards/preview/${dashboardId}\\?.*tile=${TILE_ID}`),
      { timeout: MEDIUM_WAIT },
    );
    const tile = page.locator(`[data-tile-id="${TILE_ID}"]`);
    await expect(tile).toBeInViewport({ timeout: MEDIUM_WAIT });
    // The highlight fades after a few seconds, so it is checked at once.
    await expect(tile).toHaveClass(/highlighted/);
  } finally {
    await deleteSeededDashboard({ admin, dashboardId });
    await deleteSeededCaseRecord({ admin, conceptId });
  }
});
