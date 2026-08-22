import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_BOUNDARY_POLYGONS_CSV_PATH,
  GIS_BOUNDARY_POLYGONS_ROW_COUNT,
  GIS_BOUNDARY_SUMMARY_CSV_PATH,
  GIS_BOUNDARY_SUMMARY_ROW_COUNT,
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

const BOUNDARY_DATASET_NAME = "boundary-polygons.csv";
const SUMMARY_DATASET_NAME = "boundary-summary.csv";
const MAP_NAME = "E2E GIS boundary join";

async function _selectOption(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("joins normalized source keys to boundaries and reports match health", async ({
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
    datasetIds.push(
      await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_BOUNDARY_POLYGONS_CSV_PATH,
        expectedRowCount: GIS_BOUNDARY_POLYGONS_ROW_COUNT,
      }),
    );
    datasetIds.push(
      await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_BOUNDARY_SUMMARY_CSV_PATH,
        expectedRowCount: GIS_BOUNDARY_SUMMARY_ROW_COUNT,
      }),
    );
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: SUMMARY_DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await _selectOption(page, inspector, "Geometry", "Join to boundaries");
    await _selectOption(page, inspector, "Data key column", "boundary_key");
    await _selectOption(
      page,
      inspector,
      "Boundary dataset",
      BOUNDARY_DATASET_NAME,
    );
    await _selectOption(
      page,
      inspector,
      "Boundary geometry column",
      "geometry",
    );
    await _selectOption(page, inspector, "Boundary key column", "code");
    await _selectOption(page, inspector, "Boundary display name", "name");
    await _selectOption(page, inspector, "Matching", "Normalized name");
    await _selectOption(page, inspector, "Aggregation", "Count");

    await expect(
      inspector.getByRole("button", { name: "Review matches" }),
    ).toBeVisible({
      timeout: LONG_WAIT,
    });
    await inspector.getByRole("button", { name: "Review matches" }).click();
    const report = inspector.getByRole("region", {
      name: "Boundary match report",
    });
    await expect(
      report.getByText(/[1-9]\d* unmatched source keys/),
    ).toBeVisible();
    await expect(
      report.getByText(/[1-9]\d* duplicate boundary keys/),
    ).toBeVisible();
    await expect(
      report.getByText(/[1-9]\d* ambiguous source keys/),
    ).toBeVisible();
    await expect(report).toContainText("DUPLICATE");
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.reload();
    await expect(
      inspector.getByRole("combobox", { name: "Matching" }),
    ).toHaveValue("Normalized name", { timeout: LONG_WAIT });
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
