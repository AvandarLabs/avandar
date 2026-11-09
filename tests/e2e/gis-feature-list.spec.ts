import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_NYC_EXPOSURE_SITES_CSV_PATH,
  GIS_NYC_EXPOSURE_SITES_ROW_COUNT,
  GIS_NYC_SCHOOL_POINTS_PARQUET_PATH,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import { refreshCatalogFacetCounts } from "./helpers/refreshCatalogFacetCounts";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  deleteOpenDataListingCopies,
  seedOpenDataListingCopy,
} from "./helpers/seedOpenDataListingCopy";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
import type { Locator, Page } from "@playwright/test";

const MAP_NAME = "E2E GIS feature list";
const SITES_LAYER_NAME = "nyc-exposure-sites.csv";
const SCREENSHOT_DIR = ".temp/feat-gis-filter-by-layer";

/**
 * The pipeline the seeded listing is filed under. Only this spec uses it, so
 * cleaning up by it removes this spec's listing and nothing else, including
 * a listing a killed earlier run left behind.
 */
const E2E_PIPELINE_NAME = "e2e-gis-feature-list";

/** Seeded listing name. "Brindlecove" is in no real listing's name. */
const SCHOOLS_LISTING_NAME = "Brindlecove school point locations";

/** Rows in the seeded schools listing. */
const SCHOOL_ROW_COUNT = 35;

/**
 * Schools in the seeded listing that fall inside the half-mile (805 m) rings
 * around the two sites, and the nearest of them. Measured from the fixture
 * with DuckDB spatial in UTM zone 18N, the meters CRS the buffer compiles in.
 * No school lies within 120 m of a ring's edge, so the count cannot shift
 * with how finely a ring is drawn.
 */
const EXPECTED_SCHOOL_COUNT = 16;
const NEAREST_SCHOOL_NAME = "The Clinton School";
const NEAREST_SCHOOL_DISTANCE = "0.09 mi";

async function _pickOption(
  page: Page,
  scope: Locator,
  comboboxName: string,
  optionName: string,
): Promise<void> {
  await scope
    .getByRole("combobox", { name: comboboxName, exact: true })
    .click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/** Adds the seeded schools listing from the catalog; returns its dataset id. */
async function _addSchoolsListing(
  page: Page,
  workspaceSlug: string,
): Promise<string> {
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(SCHOOLS_LISTING_NAME, { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: SCHOOLS_LISTING_NAME })
    .click();
  await page.getByRole("button", { name: "Add dataset to workspace" }).click();
  await expect(page.getByText("Dataset added")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await page.getByRole("link", { name: SCHOOLS_LISTING_NAME }).click();
  await page.waitForURL(/\/data-manager\/[0-9a-f-]{36}/i);
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  return datasetId;
}

/**
 * Adds a layer from a dataset. The first layer comes from the empty map's
 * call to action, and later ones from the Layers panel.
 */
async function _addLayer(
  page: Page,
  options: Readonly<{ datasetName: string; isFirstLayer: boolean }>,
): Promise<Locator> {
  const addButton = options.isFirstLayer
    ? page
        .getByRole("region", { name: new RegExp(MAP_NAME) })
        .getByRole("button", { name: "Add a layer" })
    : page
        .getByRole("region", { name: "Layers" })
        .getByRole("button", { name: "Add layer", exact: true });
  await addButton.click();
  await page.getByPlaceholder("Search data sources").click();
  await page.getByRole("option", { name: options.datasetName }).click();
  return page.getByRole("region", { name: "Layer", exact: true });
}

async function _addSchoolsLayer(page: Page): Promise<void> {
  const inspector = await _addLayer(page, {
    datasetName: SCHOOLS_LISTING_NAME,
    isFirstLayer: true,
  });
  await _pickOption(page, inspector, "Geometry", "Geometry column");
  await _pickOption(page, inspector, "Geometry column", "the_geom");
  await _pickOption(page, inspector, "Expected geometry", "Point");
  await expect(
    inspector.getByText(
      `${SCHOOL_ROW_COUNT} of ${SCHOOL_ROW_COUNT} rows mapped`,
    ),
  ).toBeVisible({ timeout: LONG_WAIT });
  await _showSchoolNameInPopup(page, inspector);
}

/**
 * Narrows the schools popup to the school name. A geometry column layer
 * starts with every field in its popup but queries none of them, and the
 * feature list shows the popup's queried fields.
 */
async function _showSchoolNameInPopup(
  page: Page,
  inspector: Locator,
): Promise<void> {
  await inspector.getByRole("button", { name: /^Popup/ }).click();
  const fields = inspector.getByRole("combobox", { name: "Fields" });
  // Mantine hides the clear button from assistive technology, so it is
  // found by its class inside the Fields input.
  await inspector
    .locator(".mantine-MultiSelect-root", {
      has: page.getByRole("combobox", { name: "Fields" }),
    })
    .locator(".mantine-InputClearButton-root")
    .click();
  await fields.fill("loc_name");
  await page.getByRole("option", { name: "loc_name", exact: true }).click();
  await expect(inspector.getByRole("button", { name: /^Popup/ })).toContainText(
    "1 field",
  );
}

/** Buffers the selected sites by half a mile and filters schools by it. */
async function _bufferSitesAndFilterSchools(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Buffer around a layer", exact: true })
    .click();
  const bufferForm = page.getByRole("dialog");
  // The unit goes first: changing it restates the distance already entered.
  await _pickOption(page, bufferForm, "Unit", "mi");
  await bufferForm.getByRole("textbox", { name: "Distance" }).fill("0.5");
  await bufferForm.getByRole("button", { name: "Confirm" }).click();
  await _pickOption(
    page,
    bufferForm,
    "Filter another layer by this buffer",
    SCHOOLS_LISTING_NAME,
  );
  await bufferForm
    .getByRole("button", { name: "Filter and show list" })
    .click();
}

/**
 * Shows the nearest school from its row, then pulls back far enough to see
 * both half-mile rings, for the screenshot of the map beside its list.
 */
async function _showRingsAroundNearestSchool(
  page: Page,
  firstRow: Locator,
): Promise<void> {
  await firstRow
    .getByRole("button", { name: `Show ${NEAREST_SCHOOL_NAME} on the map` })
    .click();
  await page.getByRole("button", { name: "Collapse the legend" }).click();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return window.__avandarE2EMap?.isMoving() === false;
      });
    })
    .toBe(true);
  await page.evaluate(() => {
    window.__avandarE2EMap?.jumpTo({ zoom: 14 });
  });
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return window.__avandarE2EMap?.areTilesLoaded() === true;
      });
    })
    .toBe(true);
}

test.describe("GIS feature list", () => {
  test.beforeAll(async () => {
    const admin = createSupabaseAdminClient();
    await deleteOpenDataListingCopies({
      admin,
      pipelineName: E2E_PIPELINE_NAME,
    });
    await seedOpenDataListingCopy({
      admin,
      pipelineName: E2E_PIPELINE_NAME,
      displayName: SCHOOLS_LISTING_NAME,
      parquetPath: GIS_NYC_SCHOOL_POINTS_PARQUET_PATH,
    });
    await refreshCatalogFacetCounts(admin);
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    await deleteOpenDataListingCopies({
      admin,
      pipelineName: E2E_PIPELINE_NAME,
    });
    await refreshCatalogFacetCounts(admin);
  });

  test(
    "lists the schools within half a mile of two sites, nearest first",
    { tag: E2E_ONLINE_TAG },
    async ({ page, e2eWorkerDb }) => {
      const admin = createSupabaseAdminClient();
      const { primaryUser, workspaceSlug } = e2eWorkerDb;
      const datasetIds: string[] = [];
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
        datasetIds.push(
          await importDatasetViaUi({
            page,
            workspaceSlug,
            filePath: GIS_NYC_EXPOSURE_SITES_CSV_PATH,
            expectedRowCount: GIS_NYC_EXPOSURE_SITES_ROW_COUNT,
          }),
        );
        datasetIds.push(await _addSchoolsListing(page, workspaceSlug));
        await page.getByRole("link", { name: "Maps" }).click();
        await page
          .getByRole("link", { name: `Open the map ${MAP_NAME}` })
          .click();
        await _addSchoolsLayer(page);
        const sitesInspector = await _addLayer(page, {
          datasetName: SITES_LAYER_NAME,
          isFirstLayer: false,
        });
        await expect(
          sitesInspector.getByText("2 of 2 rows mapped"),
        ).toBeVisible({ timeout: LONG_WAIT });
        await _bufferSitesAndFilterSchools(page);

        const featureList = page.getByRole("region", {
          name: /^Feature list:/,
        });
        await expect(
          featureList.getByText(`${EXPECTED_SCHOOL_COUNT} features`),
        ).toBeVisible({ timeout: LONG_WAIT });
        const firstRow = featureList.getByRole("row").nth(1);
        await expect(firstRow).toContainText(NEAREST_SCHOOL_NAME);
        await expect(firstRow).toContainText(NEAREST_SCHOOL_DISTANCE);
        await featureList.screenshot({
          path: `${SCREENSHOT_DIR}/feature-list-drawer.png`,
        });
        await _showRingsAroundNearestSchool(page, firstRow);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/feature-list.png` });
      } finally {
        await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
        for (const datasetId of datasetIds) {
          await deleteDatasetAndShares({
            supabaseAdminClient: admin,
            datasetId,
          });
        }
      }
    },
  );
});
