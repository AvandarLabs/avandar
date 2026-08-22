import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_CLUSTER_POINTS_CSV_PATH,
  GIS_CLUSTER_POINTS_ROW_COUNT,
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

const DATASET_NAME = "cluster-points.csv";
const MAP_NAME = "E2E GIS point classification";

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

test("classifies a latitude and longitude layer and keeps its legend keys", async ({
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
      filePath: GIS_CLUSTER_POINTS_CSV_PATH,
      expectedRowCount: GIS_CLUSTER_POINTS_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await expect(inspector.getByText("8 of 8 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await inspector
      .getByRole("button", { name: "Edit classification" })
      .click();
    await _selectOption(page, inspector, "Color mode", "Graduated");

    // A point layer classifies its own numeric query columns, and offers only
    // those as denominators because it is joined to no boundary set.
    await inspector.getByRole("combobox", { name: "Normalize by" }).click();
    await expect(
      page.getByRole("option", { name: "cases", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "population", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /\(boundary\)/ }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    const legend = page.getByRole("region", { name: "Legend" });
    const legendKeys = legend.getByRole("listitem");
    await expect(legendKeys.first()).toBeVisible({ timeout: LONG_WAIT });
    await expect
      .poll(async () => {
        return legendKeys.count();
      })
      .toBeGreaterThan(1);
    const legendKeysBeforeReload = await legendKeys.allTextContents();
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await page.reload();
    await expect(legend).toBeVisible({ timeout: LONG_WAIT });
    await expect(legendKeys).toHaveText(legendKeysBeforeReload);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
