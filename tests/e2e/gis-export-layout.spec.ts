import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const MAP_NAME = "E2E GIS export layout";
const TITLE_TEXT = "Cholera sitrep, week 34";
const DISCLAIMER_TEXT =
  "Boundaries reflect the last agreed OCHA reference layer, not a legal claim.";

/** Waits for the map instance to finish loading after a navigation. */
async function _waitForMapLoaded(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          return window.__avandarE2EMap?.loaded() === true;
        });
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
}

test("persists the export layout across a reload and matches the on-screen furniture", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let mapId = "";
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    mapId = await seedAvaMap({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await expect(mapRegion).toBeVisible();
    await _waitForMapLoaded(page);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("radio", { name: "Portrait" }).click();

    const titleInput = dialog.getByRole("textbox", {
      name: "Title",
      exact: true,
    });
    await expect(async () => {
      await titleInput.fill(TITLE_TEXT);
      await expect(titleInput).toHaveValue(TITLE_TEXT, {
        timeout: SHORT_WAIT,
      });
    }).toPass({ timeout: MEDIUM_WAIT });

    const disclaimerInput = dialog.getByRole("textbox", {
      name: "Disclaimer",
    });
    await expect(async () => {
      await disclaimerInput.fill(DISCLAIMER_TEXT);
      await expect(disclaimerInput).toHaveValue(DISCLAIMER_TEXT, {
        timeout: SHORT_WAIT,
      });
    }).toPass({ timeout: MEDIUM_WAIT });

    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    const furnitureBar = page.getByTestId("map-furniture-bar");
    await expect(furnitureBar.getByText(DISCLAIMER_TEXT)).toBeVisible();
    await expect(
      furnitureBar.getByText(
        "The boundaries and names shown do not imply official endorsement or acceptance.",
      ),
    ).toHaveCount(0);

    await page.reload();
    await _waitForMapLoaded(page);

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const reopenedDialog = page.getByRole("dialog", { name: "Export" });
    await expect(reopenedDialog).toBeVisible();

    await expect(
      reopenedDialog.getByRole("radio", { name: "Portrait" }),
    ).toBeChecked();
    await expect(
      reopenedDialog.getByRole("textbox", { name: "Title", exact: true }),
    ).toHaveValue(TITLE_TEXT);
    await expect(
      reopenedDialog.getByRole("textbox", { name: "Disclaimer" }),
    ).toHaveValue(DISCLAIMER_TEXT);

    const reloadedFurnitureBar = page.getByTestId("map-furniture-bar");
    await expect(
      reloadedFurnitureBar.getByText(DISCLAIMER_TEXT),
    ).toBeVisible();
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
  }
});
