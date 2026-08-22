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
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const DATASET_NAME = "cluster-points.csv";
const MAP_NAME = "E2E GIS heatmap";

/** Centre of the fixture's tight six-point group, where heat is densest. */
const HOTTEST_COORDINATE = [10.0005, 10.0005] as const;

/** MapLibre ids of every rendered heatmap layer. */
async function _readHeatmapLayerIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const layers = window.__avandarE2EMap?.getStyle().layers ?? [];
    return layers
      .filter((layer) => {
        return layer.type === "heatmap";
      })
      .map((layer) => {
        return layer.id;
      });
  });
}

/** Projects the densest fixture coordinate into canvas coordinates. */
async function _projectHottestPoint(
  page: Page,
): Promise<{ x: number; y: number }> {
  return page.evaluate((coordinate) => {
    const map = window.__avandarE2EMap;
    if (!map) {
      throw new Error("MapLibre is not exposed as window.__avandarE2EMap.");
    }
    return map.project([coordinate[0], coordinate[1]]);
  }, HOTTEST_COORDINATE);
}

test("draws a heatmap whose paint does not open the feature inspector", async ({
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
    await inspector.getByRole("button", { name: "Heat", exact: true }).click();
    await expect(
      inspector.getByRole("textbox", { name: "Heat radius" }),
    ).toBeVisible();

    const legend = page.getByRole("region", { name: "Legend" });
    await expect(legend.getByRole("img", { name: "Low to High" })).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect
      .poll(
        async () => {
          return (await _readHeatmapLayerIds(page)).length;
        },
        { timeout: LONG_WAIT },
      )
      .toBe(1);

    // The click must land on painted heat, or "no inspector opened" would pass
    // for the trivial reason that nothing was hit.
    const heatmapLayerIds = await _readHeatmapLayerIds(page);
    const projected = await _projectHottestPoint(page);
    const paintedFeatureCount = await page.evaluate(
      ({ point, layerIds }) => {
        return (
          window.__avandarE2EMap?.queryRenderedFeatures([point.x, point.y], {
            layers: layerIds,
          }).length ?? 0
        );
      },
      { point: projected, layerIds: heatmapLayerIds },
    );
    expect(paintedFeatureCount).toBeGreaterThan(0);

    const canvasBounds = await mapRegion
      .locator(".maplibregl-canvas")
      .boundingBox();
    if (!canvasBounds) {
      throw new Error("MapLibre canvas was not visible for the heat click.");
    }
    await page.mouse.click(
      canvasBounds.x + projected.x,
      canvasBounds.y + projected.y,
    );
    await expect(
      page.getByRole("region", { name: "Feature", exact: true }),
    ).toHaveCount(0, {
      timeout: SHORT_WAIT,
    });
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
