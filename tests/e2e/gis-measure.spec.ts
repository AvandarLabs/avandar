import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const MAP_NAME = "E2E GIS measure";

/** Clicks two canvas points so the measure tool has a visible length. */
async function _clickMeasurePath(page: Page): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const canvasBox = await mapCanvas.boundingBox();
  if (!canvasBox) {
    throw new Error("MapLibre canvas was not visible for the measure clicks.");
  }
  await mapCanvas.click({
    position: { x: canvasBox.width * 0.35, y: canvasBox.height * 0.18 },
    force: true,
  });
  await mapCanvas.click({
    position: { x: canvasBox.width * 0.55, y: canvasBox.height * 0.18 },
    force: true,
  });
}

test("shows a measure readout after two clicks and drops it on Pan", async ({
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

    const measureTool = page.getByRole("button", {
      name: "Measure distance and area",
    });
    await expect(async () => {
      await page.keyboard.press("Escape");
      await measureTool.click();
      await expect(measureTool).toHaveAttribute("aria-pressed", "true");
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      await _clickMeasurePath(page);
      await expect(
        page.getByRole("status", { name: "Measure readout" }),
      ).toBeVisible({ timeout: SHORT_WAIT });
    }).toPass({ timeout: LONG_WAIT });

    await page.getByRole("button", { name: "Pan and select" }).click();
    await expect(
      page.getByRole("status", { name: "Measure readout" }),
    ).toHaveCount(0);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
  }
});
