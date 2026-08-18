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

const MAP_NAME = "E2E GIS annotations";
const ANNOTATION_TEXT = "E2E note";

type AnnotationSnapshot = {
  featureCount: number;
  kinds: string[];
  fillVisibility: string | undefined;
};

/** Clicks a canvas fraction so annotation tools miss the empty-map overlay. */
async function _clickCanvasFraction(
  page: Page,
  xFraction: number,
  yFraction: number,
): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const canvasBox = await mapCanvas.boundingBox();
  if (!canvasBox) {
    throw new Error(
      "MapLibre canvas was not visible for the annotation click.",
    );
  }
  await mapCanvas.click({
    position: {
      x: canvasBox.width * xFraction,
      y: canvasBox.height * yFraction,
    },
    force: true,
  });
}

async function _selectAnnotateKind(page: Page, name: string): Promise<void> {
  const tool = page.getByRole("button", { name, exact: true });
  await tool.click();
  await expect(tool).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/** Draws a triangle in the upper canvas so the empty-map card is missed. */
async function _drawAnnotationArea(page: Page): Promise<void> {
  await page.getByRole("heading", { name: "Layers", exact: true }).click();
  await page.keyboard.press("Escape");
  const annotate = page.getByRole("button", {
    name: "Annotate the map",
    exact: true,
  });
  if ((await annotate.getAttribute("aria-expanded")) !== "true") {
    await annotate.click();
  }
  await _selectAnnotateKind(page, "Draw an annotation area");
  await _clickCanvasFraction(page, 0.35, 0.18);
  await _clickCanvasFraction(page, 0.55, 0.18);
  await _clickCanvasFraction(page, 0.45, 0.28);
  await page.getByRole("heading", { name: "Layers", exact: true }).click();
  await page.keyboard.press("Enter");
}

async function _readAnnotationSnapshot(
  page: Page,
): Promise<AnnotationSnapshot> {
  return page.evaluate(() => {
    const map = window.__avandarE2EMap;
    const source = map?.getStyle()?.sources["ava-map-annotations"];
    const data =
      source && source.type === "geojson" && typeof source.data === "object" ?
        (source.data as GeoJSON.FeatureCollection)
      : { type: "FeatureCollection" as const, features: [] };
    return {
      featureCount: data.features.length,
      kinds: data.features.map((feature) => {
        return String(feature.properties?.kind ?? "");
      }),
      fillVisibility:
        map?.getLayoutProperty("ava-map-annotations-fill", "visibility") ??
        undefined,
    };
  });
}

test("persists text and area annotations and hides them from the row", async ({
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

    await page
      .getByRole("button", { name: "Annotate the map", exact: true })
      .click();
    await _selectAnnotateKind(page, "Place text");
    await _clickCanvasFraction(page, 0.4, 0.18);
    const textField = page.getByRole("textbox", { name: "Annotation text" });
    await expect(textField).toBeVisible({ timeout: SHORT_WAIT });
    await textField.fill(ANNOTATION_TEXT);
    await expect(textField).toHaveValue(ANNOTATION_TEXT);

    await _drawAnnotationArea(page);
    await expect
      .poll(
        async () => {
          const snapshot = await _readAnnotationSnapshot(page);
          return (
            snapshot.kinds.includes("text") && snapshot.kinds.includes("area")
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);
    await expect(
      page.getByRole("region", { name: "Layers" }).getByText("Annotations"),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await page.reload();
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
    await expect
      .poll(
        async () => {
          const snapshot = await _readAnnotationSnapshot(page);
          return (
            snapshot.featureCount === 2 &&
            snapshot.kinds.includes("text") &&
            snapshot.kinds.includes("area") &&
            snapshot.fillVisibility !== "none"
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    await page
      .getByRole("button", { name: "Hide the layer Annotations" })
      .click();
    await expect
      .poll(
        async () => {
          const snapshot = await _readAnnotationSnapshot(page);
          const rendered = await page.evaluate(() => {
            return (
              window.__avandarE2EMap?.queryRenderedFeatures({
                layers: [
                  "ava-map-annotations-fill",
                  "ava-map-annotations-line",
                  "ava-map-annotations-symbol",
                ],
              }).length ?? -1
            );
          });
          return (
            snapshot.featureCount === 2 &&
            snapshot.fillVisibility === "none" &&
            rendered === 0
          );
        },
        { timeout: MEDIUM_WAIT },
      )
      .toBe(true);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
  }
});
