import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_GEOMETRY_FORMATS_CSV_PATH,
  GIS_GEOMETRY_FORMATS_ROW_COUNT,
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

const DATASET_NAME = "geometry-formats.csv";
const MAP_NAME = "E2E GIS geometry columns";

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

test("renders WKT, hexadecimal WKB, and GeoJSON geometry columns", async ({
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
      filePath: GIS_GEOMETRY_FORMATS_CSV_PATH,
      expectedRowCount: GIS_GEOMETRY_FORMATS_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await _selectOption(page, inspector, "Geometry", "Geometry column");
    await _selectOption(page, inspector, "Geometry column", "wkt");
    await inspector
      .getByRole("button", { name: "Filter", exact: true })
      .click();
    const filters = inspector.getByTestId("query-filters-field");
    await filters.getByTitle("Add rule").click();
    await filters.getByTitle("Value").fill("3");
    await _selectOption(page, inspector, "Expected geometry", "Polygon");
    await expect(inspector.getByText("1 of 1 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });

    await _selectOption(page, inspector, "Geometry column", "wkb_hex");
    await _selectOption(page, inspector, "Encoding", "WKB");
    await expect(inspector.getByText("1 of 1 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });

    await _selectOption(page, inspector, "Geometry column", "geojson");
    await _selectOption(page, inspector, "Encoding", "GeoJSON");
    await expect(inspector.getByText("1 of 1 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.reload();
    await expect(
      inspector.getByRole("combobox", { name: "Geometry column" }),
    ).toHaveValue("geojson", { timeout: LONG_WAIT });
    await expect(
      inspector.getByRole("combobox", { name: "Encoding" }),
    ).toHaveValue("GeoJSON");
    await expect(inspector.getByText("1 of 1 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({
        supabaseAdminClient: admin,
        datasetId,
      });
    }
  }
});
