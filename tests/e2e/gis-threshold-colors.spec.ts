import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_MODZCTA_MANHATTAN_PARQUET_PATH,
  GIS_SCHOOL_IMMUNIZATION_MANHATTAN_PARQUET_PATH,
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
import type { Locator, Page } from "@playwright/test";

const MAP_NAME = "E2E GIS threshold colors";

/**
 * The pipeline the seeded listings are filed under. Only this spec uses it,
 * so cleaning up by it removes this spec's listings and nothing else,
 * including listings a killed earlier run left behind.
 */
const E2E_PIPELINE_NAME = "e2e-gis-threshold-colors";

/** Seeded listing names. "Quillmoor" is in no real listing's name. */
const BOUNDARY_LISTING_NAME = "Quillmoor ZIP code areas";
const SCHOOL_LISTING_NAME = "Quillmoor school immunization survey";

async function _selectOption(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Seeds both listings with their Parquet copies, after any leftovers. */
async function _seedListings(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<void> {
  await deleteOpenDataListingCopies({ admin, pipelineName: E2E_PIPELINE_NAME });
  await seedOpenDataListingCopy({
    admin,
    pipelineName: E2E_PIPELINE_NAME,
    displayName: BOUNDARY_LISTING_NAME,
    parquetPath: GIS_MODZCTA_MANHATTAN_PARQUET_PATH,
  });
  await seedOpenDataListingCopy({
    admin,
    pipelineName: E2E_PIPELINE_NAME,
    displayName: SCHOOL_LISTING_NAME,
    parquetPath: GIS_SCHOOL_IMMUNIZATION_MANHATTAN_PARQUET_PATH,
  });
  await refreshCatalogFacetCounts(admin);
}

/** Adds one open data listing from the catalog and returns its dataset id. */
async function _addListingToWorkspace(
  options: Readonly<{ page: Page; workspaceSlug: string; listingName: string }>,
): Promise<string> {
  const { page, workspaceSlug, listingName } = options;
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

/** Binds the school layer to ZIP areas as an average of measles coverage. */
async function _bindSchoolsToZipAreas(
  page: Page,
  inspector: Locator,
): Promise<void> {
  await _selectOption(
    page,
    inspector,
    "Geometry",
    "Aggregate points to boundaries",
  );
  await _selectOption(
    page,
    inspector,
    "Point geometry",
    "Point geometry column",
  );
  await _selectOption(page, inspector, "Point geometry column", "location");
  await _selectOption(
    page,
    inspector,
    "Boundary dataset",
    BOUNDARY_LISTING_NAME,
  );
  await _selectOption(page, inspector, "Boundary geometry column", "the_geom");
  await _selectOption(page, inspector, "Boundary key column", "modzcta");
  await _selectOption(page, inspector, "Aggregation", "Average");
  await _selectOption(page, inspector, "Measure", "percent_immunized_measles");
}

test.describe("GIS threshold colors", () => {
  test.beforeAll(async () => {
    await _seedListings(createSupabaseAdminClient());
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    await deleteOpenDataListingCopies({
      admin,
      pipelineName: E2E_PIPELINE_NAME,
    });
    await refreshCatalogFacetCounts(admin);
  });

  test("labels the classes below and above 95% in a ZIP choropleth legend", async ({
    page,
    e2eWorkerDb,
  }) => {
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
      for (const listingName of [BOUNDARY_LISTING_NAME, SCHOOL_LISTING_NAME]) {
        datasetIds.push(
          await _addListingToWorkspace({ page, workspaceSlug, listingName }),
        );
      }

      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      const mapRegion = page.getByRole("region", {
        name: new RegExp(MAP_NAME),
      });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: SCHOOL_LISTING_NAME }).click();

      const inspector = page.getByRole("region", {
        name: SCHOOL_LISTING_NAME,
        exact: true,
      });
      await _bindSchoolsToZipAreas(page, inspector);
      await inspector
        .getByRole("button", { name: "Edit classification" })
        .click();
      await _selectOption(page, inspector, "Color mode", "Graduated");

      // The shortcut can tell fractions from percents only once the layer has
      // classified its values.
      await expect(
        inspector.getByText("No classified values are available yet."),
      ).toBeHidden({ timeout: LONG_WAIT });
      await inspector
        .getByRole("textbox", { name: "Highlight values below" })
        .fill("95");

      const legend = page.getByRole("region", { name: "Legend" });
      await expect(legend.getByText("Below 95%", { exact: true })).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(
        legend.getByText("95% or above", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: ".temp/feat-gis-threshold-colors/threshold-legend.png",
      });
      await inspector.screenshot({
        path: ".temp/feat-gis-threshold-colors/threshold-class-editor.png",
      });
      await expect(
        page.getByRole("status", { name: "All changes saved" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await page.reload();
      await expect(legend.getByText("Below 95%", { exact: true })).toBeVisible({
        timeout: LONG_WAIT,
      });
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      for (const datasetId of datasetIds) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId,
        });
      }
    }
  });
});
