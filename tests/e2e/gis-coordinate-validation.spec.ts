import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_WAVE_C_SWAPPED_POINT_ROW_COUNT,
  GIS_WAVE_C_SWAPPED_POINTS_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const DATASET_NAME = "gis-wave-c-swapped-points.csv";
const MAP_NAME = "E2E GIS coordinate validation";

/** Every rendered point coordinate, rounded to the fixture's precision. */
async function _readRenderedCoordinates(
  page: Page,
): Promise<Array<[number, number]>> {
  return page.evaluate(() => {
    const sources = window.__avandarE2EMap?.getStyle().sources ?? {};
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

test("explains dropped coordinates and maps them after swapping", async ({
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
      filePath: GIS_WAVE_C_SWAPPED_POINTS_CSV_PATH,
      expectedRowCount: GIS_WAVE_C_SWAPPED_POINT_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    await expect(page.getByText("2 of 4 rows could not be mapped")).toBeVisible(
      { timeout: LONG_WAIT },
    );
    await expect(
      page.getByText(
        "Some rows look like their latitude and longitude are swapped.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "See why" }).click();

    const report = page.getByRole("region", {
      name: "Coordinate validation report",
    });
    await expect(
      report.getByRole("heading", {
        name: "Latitude and longitude look swapped",
      }),
    ).toBeVisible();
    await expect(report.getByText("2 rows", { exact: true })).toBeVisible();
    await expect(report).toContainText("Rows 2 and 3.");
    await report
      .getByRole("button", { name: "Swap latitude and longitude" })
      .click();

    await expect(page.getByText("2 of 4 rows could not be mapped")).toHaveCount(
      0,
      { timeout: LONG_WAIT },
    );
    await report.getByRole("button", { name: "Back" }).click();
    const inspector = page.getByRole("region", { name: "Layer" });
    await expect(inspector.getByText("4 of 4 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect
      .poll(async () => {
        return (await _readRenderedCoordinates(page)).sort();
      })
      .toEqual(
        [
          [20, 10],
          [22, 12],
          [120.5, 10.5],
          [130.5, 11.5],
        ].sort(),
      );
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
