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
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

const DATASET_NAME = "dated-points.csv";
const MAP_NAME = "E2E GIS time range";
const OUTLIER_COORDINATE = [11, 10] as const;
const INLIER_COORDINATE = [10, 10] as const;

/** Selects one Mantine option by its visible label. */
async function _selectOption(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

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
        return feature.geometry.type === "Point"
          ? [
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

function _hasCoordinate(
  coordinates: ReadonlyArray<readonly [number, number]>,
  expected: readonly [number, number],
): boolean {
  return coordinates.some((coordinate) => {
    return coordinate[0] === expected[0] && coordinate[1] === expected[1];
  });
}

/** Drags the end thumb left so the later week falls outside the range. */
async function _narrowTimeRangeToFirstWeek(page: Page): Promise<void> {
  const group = page.getByRole("group", { name: "Time range" });
  const endThumb = group.getByRole("slider").nth(1);
  await expect(async () => {
    await endThumb.focus();
    await endThumb.press("ArrowLeft");
    await expect(endThumb).not.toHaveAttribute("aria-valuenow", "1000");
  }).toPass({ timeout: LONG_WAIT });
  const groupBox = await group.boundingBox();
  const thumbBox = await endThumb.boundingBox();
  if (!groupBox || !thumbBox) {
    throw new Error("Time range slider was not visible.");
  }
  await page.mouse.move(
    thumbBox.x + thumbBox.width / 2,
    thumbBox.y + thumbBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    groupBox.x + groupBox.width * 0.4,
    groupBox.y + groupBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
}

test("filters dated points to the dragged range and keeps it after reload", async ({
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
    await _selectOption(page, inspector, "Time column", "observed_at");
    await expect(page.getByRole("group", { name: "Time range" })).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect
      .poll(
        async () => {
          const coordinates = await _readRenderedCoordinates(page);
          return (
            _hasCoordinate(coordinates, INLIER_COORDINATE) &&
            _hasCoordinate(coordinates, OUTLIER_COORDINATE)
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    await expect(async () => {
      await _narrowTimeRangeToFirstWeek(page);
      const coordinates = await _readRenderedCoordinates(page);
      expect(_hasCoordinate(coordinates, INLIER_COORDINATE)).toBe(true);
      expect(_hasCoordinate(coordinates, OUTLIER_COORDINATE)).toBe(false);
    }).toPass({ timeout: LONG_WAIT });
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
          const coordinates = await _readRenderedCoordinates(page);
          return (
            _hasCoordinate(coordinates, INLIER_COORDINATE) &&
            !_hasCoordinate(coordinates, OUTLIER_COORDINATE)
          );
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
