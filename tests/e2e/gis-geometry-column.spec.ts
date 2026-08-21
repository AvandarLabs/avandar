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

test(
  "renders WKT, hexadecimal WKB, and GeoJSON geometry columns",
  { tag: "@online" },
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
        filePath: GIS_GEOMETRY_FORMATS_CSV_PATH,
        expectedRowCount: GIS_GEOMETRY_FORMATS_ROW_COUNT,
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
      await _selectOption(page, inspector, "Geometry column", "wkt");
      await inspector
        .getByRole("button", { name: "Filter", exact: true })
        .click();
      // Narrow to row 3, the fixture's only polygon. Until then the layer
      // reports "The source contains mixed geometry families", because `wkt`
      // holds a point, a line, a polygon and a non-geometry.
      //
      // A new condition already defaults to the layer's first queried column,
      // which is `id`. The column picker deselects on a click of the value it
      // already holds, so this asserts the default rather than selecting it.
      const filters = inspector.getByTestId("query-filters-field");
      await filters.getByRole("button", { name: "+ Condition" }).click();
      await expect(
        filters.getByRole("combobox", { name: "Column", exact: true }),
      ).toHaveValue("id");
      await filters
        .getByRole("combobox", { name: "Condition", exact: true })
        .click();
      await page.getByRole("option", { name: "is", exact: true }).click();
      const filterValue = filters.getByTestId("filter-value-scalar");
      await filterValue.fill("3");
      await filterValue.press("Enter");
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

      // The reload proves the *config* survives it, and stops there.
      // Re-asserting the mapped rows would re-run the whole fetch, DuckDB
      // register and spatial query off the persisted React Query cache, which
      // a reload restores as `fresh` even when it is stale (see
      // `docs/rules/e2e-testing.md`). Nothing in a test recovers from that, so
      // it failed hard rather than slowly, and it is what made this spec
      // flake. The row count is already asserted above for all three
      // encodings.
      await page.reload();
      await expect(
        inspector.getByRole("combobox", { name: "Geometry column" }),
      ).toHaveValue("geojson", { timeout: LONG_WAIT });
      await expect(
        inspector.getByRole("combobox", { name: "Encoding" }),
      ).toHaveValue("GeoJSON");
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      if (datasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  },
);
