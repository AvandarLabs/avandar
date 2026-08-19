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
import { LONG_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const DATASET_NAME = "cluster-points.csv";
const MAP_NAME = "E2E GIS cluster";

/** Centre of the fixture's tight six-point group. */
const CLUSTERED_GROUP_COORDINATE = [10.0005, 10.0005] as const;

/** Counts rendered features MapLibre has collapsed into a cluster symbol. */
async function _countRenderedClusters(page: Page): Promise<number> {
  return page.evaluate(() => {
    const map = window.__avandarE2EMap;
    if (!map) {
      return 0;
    }
    return map.queryRenderedFeatures().filter((feature) => {
      return typeof feature.properties?.point_count === "number";
    }).length;
  });
}

/** Clicks the canvas where MapLibre currently projects the tight group. */
async function _clickClusteredGroup(page: Page): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const [projected, canvasBounds] = await Promise.all([
    page.evaluate((coordinate) => {
      const map = window.__avandarE2EMap;
      if (!map) {
        throw new Error("MapLibre is not exposed as window.__avandarE2EMap.");
      }
      return map.project([coordinate[0], coordinate[1]]);
    }, CLUSTERED_GROUP_COORDINATE),
    mapCanvas.boundingBox(),
  ]);
  if (!canvasBounds) {
    throw new Error("MapLibre canvas was not visible for the cluster click.");
  }
  await page.mouse.click(
    canvasBounds.x + projected.x,
    canvasBounds.y + projected.y,
  );
}

test("collapses nearby points into a cluster that zooms in when clicked", async ({
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
      .getByRole("button", { name: "Cluster", exact: true })
      .click();
    await expect(
      inspector.getByRole("textbox", { name: "Cluster radius" }),
    ).toBeVisible();

    await expect
      .poll(
        async () => {
          return _countRenderedClusters(page);
        },
        { timeout: LONG_WAIT },
      )
      .toBeGreaterThan(0);
    const zoomBeforeClick = await page.evaluate(() => {
      return window.__avandarE2EMap?.getZoom() ?? 0;
    });

    await _clickClusteredGroup(page);

    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            return window.__avandarE2EMap?.getZoom() ?? 0;
          });
        },
        { timeout: LONG_WAIT },
      )
      .toBeGreaterThan(zoomBeforeClick);
    await expect(page.getByRole("dialog", { name: "Feature" })).toHaveCount(0);
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
