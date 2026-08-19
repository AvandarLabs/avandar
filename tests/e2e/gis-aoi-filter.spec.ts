import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_DATED_POINTS_CSV_PATH,
  GIS_DATED_POINTS_ROW_COUNT,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const DATASET_NAME = "dated-points.csv";
const MAP_NAME = "E2E GIS AOI filter";
const OUTLIER_COORDINATE = [11, 10] as const;
const INLIER_COORDINATE = [10, 10] as const;
const PIXEL_RING_OFFSET = 60;
const PIXEL_RING = [
  [-PIXEL_RING_OFFSET, -PIXEL_RING_OFFSET],
  [PIXEL_RING_OFFSET, -PIXEL_RING_OFFSET],
  [PIXEL_RING_OFFSET, PIXEL_RING_OFFSET],
  [-PIXEL_RING_OFFSET, PIXEL_RING_OFFSET],
] as const;

/** Every rendered point coordinate, rounded to the fixture's precision. */
async function _readRenderedCoordinates(
  page: Page,
): Promise<Array<[number, number]>> {
  return page.evaluate(() => {
    const sources = window.__avandarE2EMap?.getStyle()?.sources ?? {};
    return Object.values(sources).flatMap((source) => {
      if (source.type !== "geojson" || typeof source.data !== "object") {
        return [];
      }
      const data = source.data as GeoJSON.FeatureCollection;
      return data.features.flatMap((feature) => {
        return feature.geometry.type === "Point" ?
            [
              [
                Math.round(feature.geometry.coordinates[0]! * 10) / 10,
                Math.round(feature.geometry.coordinates[1]! * 10) / 10,
              ] as [number, number],
            ]
          : [];
      });
    });
  });
}

function _countCoordinate(
  coordinates: ReadonlyArray<readonly [number, number]>,
  expected: readonly [number, number],
): number {
  return coordinates.filter((coordinate) => {
    return coordinate[0] === expected[0] && coordinate[1] === expected[1];
  }).length;
}

/** True when 10E 10N is on-canvas with room for the pixel ring. */
async function _inlierFitsPixelRing(page: Page): Promise<boolean> {
  return page.evaluate(
    ([lng, lat, pad]) => {
      const map = window.__avandarE2EMap;
      if (!map?.loaded()) {
        return false;
      }
      const point = map.project([lng, lat]);
      const canvas = map.getCanvas();
      return (
        point.x >= pad &&
        point.y >= pad &&
        point.x <= canvas.clientWidth - pad &&
        point.y <= canvas.clientHeight - pad
      );
    },
    [
      INLIER_COORDINATE[0],
      INLIER_COORDINATE[1],
      PIXEL_RING_OFFSET + 8,
    ] as const,
  );
}

/** Clicks a canvas offset from where MapLibre currently projects `origin`. */
async function _clickMapAtPixelOffset(
  page: Page,
  origin: readonly [number, number],
  offset: readonly [number, number],
): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const projected = await page.evaluate((lngLat) => {
    const map = window.__avandarE2EMap;
    if (!map) {
      throw new Error("MapLibre is not exposed as window.__avandarE2EMap.");
    }
    return map.project([lngLat[0], lngLat[1]]);
  }, origin);
  await mapCanvas.click({
    position: { x: projected.x + offset[0], y: projected.y + offset[1] },
    force: true,
  });
}

/** Draws a closed ring around 10E 10N that excludes the 11E outlier. */
async function _drawAoiAroundInliers(page: Page): Promise<void> {
  const areaTool = page.getByRole("button", {
    name: "Draw an area to filter by",
    exact: true,
  });
  await page.keyboard.press("Escape");
  await areaTool.click();
  await expect(areaTool).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
  for (const offset of PIXEL_RING) {
    await _clickMapAtPixelOffset(page, INLIER_COORDINATE, offset);
  }
  await page.keyboard.press("Enter");
}

test("draws an AOI that drops the outlier and can opt a layer out", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  let datasetId = "";
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
    datasetId = await importDatasetViaUi({
      page,
      workspaceSlug,
      filePath: GIS_DATED_POINTS_CSV_PATH,
      expectedRowCount: GIS_DATED_POINTS_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await expect(inspector.getByText("9 of 9 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await page
      .getByRole("button", {
        name: `More actions for the layer ${DATASET_NAME}`,
      })
      .click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(
      page.getByRole("region", { name: "Layers" }).getByRole("listitem"),
    ).toHaveCount(2, { timeout: MEDIUM_WAIT });

    await expect(
      page.getByRole("button", {
        name: "Draw an area to filter by",
        exact: true,
      }),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect
      .poll(
        async () => {
          return _inlierFitsPixelRing(page);
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);
    await expect(async () => {
      await _drawAoiAroundInliers(page);
      await expect(
        page.getByRole("button", { name: "Clear area filter" }),
      ).toBeVisible({ timeout: SHORT_WAIT });
    }).toPass({ timeout: LONG_WAIT });
    await expect
      .poll(
        async () => {
          const coordinates = await _readRenderedCoordinates(page);
          return (
            _countCoordinate(coordinates, INLIER_COORDINATE) > 0 &&
            _countCoordinate(coordinates, OUTLIER_COORDINATE) === 0
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    const copyName = `${DATASET_NAME} copy`;
    const copyRow = page
      .getByRole("region", { name: "Layers" })
      .getByRole("listitem")
      .filter({ has: page.getByText(copyName, { exact: true }) });
    await copyRow
      .getByRole("button", {
        name: new RegExp(
          `^${copyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`,
        ),
      })
      .click();
    await inspector
      .getByRole("button", { name: "Filter", exact: true })
      .click();
    const applyAreaFilter = inspector.getByRole("switch", {
      name: "Apply area filter",
    });
    await applyAreaFilter.click();
    await expect(applyAreaFilter).not.toBeChecked();
    await expect
      .poll(
        async () => {
          const coordinates = await _readRenderedCoordinates(page);
          return (
            _countCoordinate(coordinates, OUTLIER_COORDINATE) === 1 &&
            _countCoordinate(coordinates, INLIER_COORDINATE) > 8
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
