import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_WEB_MERCATOR_POINTS_CSV_PATH,
  GIS_WEB_MERCATOR_POINTS_ROW_COUNT,
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
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
import type { Locator, Page } from "@playwright/test";

const DATASET_NAME = "web-mercator-points.csv";
const MAP_NAME = "E2E GIS geometry source CRS";

/** WGS 84 equivalents of the fixture's EPSG:3857 point WKT. */
const EXPECTED_COORDINATES = [
  [10, 10],
  [10.5, 10.5],
  [11, 11],
];

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

/** Rendered point coordinates, rounded to the fixture's precision. */
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

test(
  "reprojects a web-mercator geometry column and keeps the source CRS",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
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
        filePath: GIS_WEB_MERCATOR_POINTS_CSV_PATH,
        expectedRowCount: GIS_WEB_MERCATOR_POINTS_ROW_COUNT,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      const mapRegion = page.getByRole("region", {
        name: new RegExp(MAP_NAME),
      });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: DATASET_NAME }).click();

      const inspector = page.getByRole("region", { name: "Layer" });
      await _selectOption(page, inspector, "Geometry", "Geometry column");
      await _selectOption(page, inspector, "Geometry column", "mercator_wkt");
      await _selectOption(page, inspector, "Expected geometry", "Point");
      await _selectOption(page, inspector, "Source CRS", "3857 - Web Mercator");

      await expect(inspector.getByText("3 of 3 rows mapped")).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect
        .poll(
          async () => {
            return _readRenderedCoordinates(page);
          },
          { timeout: LONG_WAIT },
        )
        .toEqual(EXPECTED_COORDINATES);
      await expect(
        page.getByRole("status", { name: "All changes saved" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      // The reload is deliberate: reading the saved source CRS back is the only
      // check that it survives Postgres, the route loader and the config
      // schema, whose own round-trip tests cover a geometry binding only with
      // `sourceCrs` unset. The CRS options are a static preset list, so this
      // assertion needs no query behind it.
      //
      // Do not assert the mapped-row count or the projected coordinates here.
      // Both come from the dataset query, whose persisted snapshot a reload can
      // restore as `fresh` while stale, and nothing inside a test recovers from
      // that (see `docs/rules/e2e-testing.md`). Both are proven above.
      await page.reload();
      await expect(
        inspector.getByRole("combobox", { name: "Source CRS" }),
      ).toHaveValue("3857 - Web Mercator", { timeout: LONG_WAIT });
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      if (datasetId) {
        await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
      }
    }
  },
);
