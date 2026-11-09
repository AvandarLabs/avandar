import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_NYC_EXPOSURE_SITES_PARQUET_PATH,
  GIS_NYC_SCHOOL_POINTS_PARQUET_PATH,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
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
const SCREENSHOT_DIR = ".temp/feat-gis-filter-by-layer";

/**
 * The pipeline the seeded listing is filed under. Only this spec uses it, so
 * cleaning up by it removes this spec's listing and nothing else, including
 * a listing a killed earlier run left behind.
 */
const E2E_PIPELINE_NAME = "e2e-gis-feature-list";

/** Seeded listing names. "Brindlecove" is in no real listing's name. */
const SITES_LISTING_NAME = "Brindlecove exposure sites";
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
const NEAREST_SCHOOL_ADDRESS = "10 East 15th Street";

/** The site nearest the nearest school, which the rings are labelled with. */
const NEAREST_SITE_NAME = "Union Square";

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

/** Adds a seeded listing from the catalog; returns its dataset id. */
async function _addListing(
  page: Page,
  options: Readonly<{ listingName: string; workspaceSlug: string }>,
): Promise<string> {
  const { listingName, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(listingName, { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: listingName })
    .click();
  await page.getByRole("button", { name: "Add dataset to workspace" }).click();
  await expect(page.getByText("Dataset added")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await page.getByRole("link", { name: listingName }).click();
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
  if (!options.isFirstLayer) {
    await page.getByRole("button", { name: "Back to layers" }).click();
  }
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
  return page.getByRole("region", { name: options.datasetName, exact: true });
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
}

/**
 * Buffers the selected sites by half a mile, labelling each ring with its
 * site's name, and filters schools by it.
 */
async function _bufferSitesAndFilterSchools(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Buffer around a layer", exact: true })
    .click();
  const bufferForm = page.getByRole("dialog");
  // The unit goes first: changing it restates the distance already entered.
  await _pickOption(page, bufferForm, "Unit", "mi");
  await bufferForm.getByRole("textbox", { name: "Distance" }).fill("0.5");
  await _pickOption(page, bufferForm, "Label each ring with", "site_name");
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
 * West, south, east, and north edges of the two half-mile rings: the sites'
 * extent widened by 805 m (0.0073 degrees of latitude and 0.0096 of
 * longitude at 40.73 N).
 */
const RINGS_BOUNDS: [number, number, number, number] = [
  -74.0069, 40.7235, -73.981, 40.7432,
];

/** Resolves once the map has stopped moving and drawn every tile. */
async function _waitForMapToSettle(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const map = window.__avandarE2EMap;
        return map?.isMoving() === false && map.areTilesLoaded();
      });
    })
    .toBe(true);
}

/**
 * Frames both half-mile rings clear of the layers panel, then waits for
 * every layer to redraw at the new view, for the screenshot.
 */
async function _frameRings(page: Page): Promise<void> {
  await page.evaluate((bounds) => {
    window.__avandarE2EMap?.fitBounds(bounds, {
      padding: { top: 56, bottom: 48, left: 340, right: 48 },
      duration: 0,
    });
  }, RINGS_BOUNDS);
  await _waitForMapToSettle(page);
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
    await seedOpenDataListingCopy({
      admin,
      pipelineName: E2E_PIPELINE_NAME,
      displayName: SITES_LISTING_NAME,
      parquetPath: GIS_NYC_EXPOSURE_SITES_PARQUET_PATH,
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
        for (const listingName of [SITES_LISTING_NAME, SCHOOLS_LISTING_NAME]) {
          datasetIds.push(
            await _addListing(page, { listingName, workspaceSlug }),
          );
        }
        await page.getByRole("link", { name: "Maps" }).click();
        await page
          .getByRole("link", { name: `Open the map ${MAP_NAME}` })
          .click();
        await _addSchoolsLayer(page);
        const sitesInspector = await _addLayer(page, {
          datasetName: SITES_LISTING_NAME,
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
        await expect(firstRow).toContainText(NEAREST_SITE_NAME);
        await featureList.screenshot({
          path: `${SCREENSHOT_DIR}/feature-list-drawer.png`,
        });
        // The legend folds to its header while the list is open, so it stays
        // clear of the layer list on the shortened map.
        await expect(
          page.getByRole("button", { name: "Expand the legend" }),
        ).toBeVisible();
        await _frameRings(page);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/feature-list.png` });

        // Pressing a row shows its feature in the list's place, with a way
        // back to the list.
        await firstRow
          .getByRole("button", {
            name: `Show ${NEAREST_SCHOOL_NAME} on the map`,
          })
          .click();
        const featurePanel = page.getByRole("region", {
          name: "Feature",
          exact: true,
        });
        await expect(featurePanel).toContainText(NEAREST_SCHOOL_ADDRESS);
        await expect(featureList).toBeHidden();
        await featurePanel
          .getByRole("button", { name: "Back to the feature list" })
          .click();
        await expect(firstRow).toContainText(NEAREST_SCHOOL_NAME);
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
