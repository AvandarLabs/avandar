import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_WAVE_B_BOUNDARIES_CSV_PATH,
  GIS_WAVE_B_BOUNDARY_ROW_COUNT,
  GIS_WAVE_B_POINT_ROW_COUNT,
  GIS_WAVE_B_POINTS_CSV_PATH,
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

const BOUNDARY_DATASET_NAME = "gis-wave-b-boundaries.csv";
const POINT_DATASET_NAME = "gis-wave-b-points.csv";
const MAP_NAME = "E2E GIS protected choropleth";

async function _selectOption(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("classifies area values without exposing suppressed point metrics", async ({
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
        filePath: GIS_WAVE_B_BOUNDARIES_CSV_PATH,
        expectedRowCount: GIS_WAVE_B_BOUNDARY_ROW_COUNT,
      }),
    );
    datasetIds.push(
      await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_WAVE_B_POINTS_CSV_PATH,
        expectedRowCount: GIS_WAVE_B_POINT_ROW_COUNT,
      }),
    );
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: POINT_DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await _selectOption(
      page,
      inspector,
      "Geometry",
      "Aggregate points to boundaries",
    );
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
    await _selectOption(page, inspector, "Aggregation", "Average");
    await _selectOption(page, inspector, "Measure", "value");
    await inspector.getByRole("button", { name: /^Sensitivity/ }).click();
    await _selectOption(page, inspector, "Handling", "Aggregate only");
    await inspector
      .getByRole("textbox", { name: "Suppress areas below" })
      .fill("2");

    await inspector
      .getByRole("button", { name: "Edit classification" })
      .click();
    await _selectOption(page, inspector, "Color mode", "Graduated");
    await _selectOption(
      page,
      inspector,
      "Normalize by",
      "population (boundary)",
    );

    const legend = page.getByRole("region", { name: "Legend" });
    await expect(legend.getByText("Not reported")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(legend.getByText("Suppressed")).toBeVisible();
    const legendEntriesBeforeReload = await legend
      .getByRole("listitem")
      .allTextContents();
    const protectedFeatures = await page.evaluate(() => {
      const sources = window.__avandarE2EMap?.getStyle().sources ?? {};
      return Object.values(sources).flatMap((source) => {
        if (source.type !== "geojson" || typeof source.data !== "object") {
          return [];
        }
        const data = source.data as GeoJSON.FeatureCollection;
        return data.features.filter((feature) => {
          return feature.properties?.["__avandar_state"] === "suppressed";
        });
      });
    });
    expect(protectedFeatures).toHaveLength(1);
    expect(protectedFeatures[0]?.properties).not.toHaveProperty(
      "__avandar_contributor_count",
    );
    expect(protectedFeatures[0]?.properties).not.toHaveProperty(
      "__avandar_value",
    );
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    await page.reload();
    await expect(legend).toBeVisible({ timeout: LONG_WAIT });
    await expect(legend.getByRole("listitem")).toHaveText(
      legendEntriesBeforeReload,
    );
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
