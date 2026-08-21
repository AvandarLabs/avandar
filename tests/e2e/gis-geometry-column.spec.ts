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
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
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

      // The reload earns its place: it is the only check that a saved
      // geometry column and encoding come back. The write lands in Postgres,
      // the route loader's `AvaMapClient.getById` reads it on the next load,
      // the config schema parses it, and both pickers map the stored values
      // onto their options. A field that saves but does not read back in that
      // shape fails nowhere else, and the schema rejects unknown config keys,
      // so a reshaped write is exactly the kind of regression that lands
      // here. That bug class is narrow but real.
      //
      // Do not add the mapped-row count after the reload. It comes from the
      // dataset query and its DuckDB register, and a reload can restore that
      // query's persisted snapshot as `fresh` while it is stale (see
      // `docs/rules/e2e-testing.md`), which no retry inside a test recovers
      // from. The count is already asserted above for all three encodings.
      //
      // The two assertions below are not equally safe. `Encoding` is a pure
      // config fact: a static option list, and a value the route loader
      // refetches every load. `Geometry column` is a Mantine Select whose
      // visible text is the *label* of an option supplied by the
      // dataset-columns query (`QueryColumnSingleSelect`), so it needs that
      // query as well as the config. It is kept because resolving the stored
      // column id back to a column is worth proving, but it carries a smaller
      // version of the same restore risk, so it is the first thing to look at
      // if this spec ever fails right here.
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
