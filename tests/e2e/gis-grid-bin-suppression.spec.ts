import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_GRID_BIN_POINTS_CSV_PATH,
  GIS_GRID_BIN_POINTS_ROW_COUNT,
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

const DATASET_NAME = "grid-bin-points.csv";
const MAP_NAME = "E2E GIS grid bins";

/** The lone fixture point, whose cell stays below the suppression minimum. */
const SUPPRESSED_CELL_COORDINATE = [11, 10] as const;

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

/** Every rendered cell's reserved spatial properties. */
async function _readCellProperties(
  page: Page,
): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => {
    const sources = window.__avandarE2EMap?.getStyle().sources ?? {};
    return Object.values(sources).flatMap((source) => {
      if (source.type !== "geojson" || typeof source.data !== "object") {
        return [];
      }
      const data = source.data as GeoJSON.FeatureCollection;
      return data.features.map((feature) => {
        return (feature.properties ?? {}) as Record<string, unknown>;
      });
    });
  });
}

/** Reduces cell properties to an order-independent shape. */
function _summarizeCells(
  cellProperties: ReadonlyArray<Record<string, unknown>>,
): {
  cellCount: number;
  suppressedCount: number;
  reportedCounts: unknown[];
} {
  return {
    cellCount: cellProperties.length,
    suppressedCount: cellProperties.filter((properties) => {
      return properties["__avandar_state"] === "suppressed";
    }).length,
    reportedCounts: cellProperties
      .filter((properties) => {
        return properties["__avandar_state"] === "value";
      })
      .map((properties) => {
        return properties["__avandar_contributor_count"];
      }),
  };
}

/** Clicks the canvas where MapLibre projects the suppressed cell's point. */
async function _clickSuppressedCell(page: Page): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const [projected, canvasBounds] = await Promise.all([
    page.evaluate((coordinate) => {
      const map = window.__avandarE2EMap;
      if (!map) {
        throw new Error("MapLibre is not exposed as window.__avandarE2EMap.");
      }
      return map.project([coordinate[0], coordinate[1]]);
    }, SUPPRESSED_CELL_COORDINATE),
    mapCanvas.boundingBox(),
  ]);
  if (!canvasBounds) {
    throw new Error("MapLibre canvas was not visible for the cell click.");
  }
  await page.mouse.click(
    canvasBounds.x + projected.x,
    canvasBounds.y + projected.y,
  );
}

test("bins points into cells and hides counts below the minimum", async ({
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
      filePath: GIS_GRID_BIN_POINTS_CSV_PATH,
      expectedRowCount: GIS_GRID_BIN_POINTS_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await expect(inspector.getByText("5 of 5 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await _selectOption(page, inspector, "Geometry", "Bin into a grid");
    await expect(
      inspector.getByRole("textbox", { name: "Cell size (meters)" }),
    ).toBeVisible();

    await inspector.getByRole("button", { name: /^Sensitivity/ }).click();
    await _selectOption(page, inspector, "Handling", "Aggregate only");
    await inspector
      .getByRole("textbox", { name: "Suppress areas below" })
      .fill("2");

    const legend = page.getByRole("region", { name: "Legend" });
    await expect(legend.getByText("Suppressed")).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect
      .poll(
        async () => {
          return _summarizeCells(await _readCellProperties(page));
        },
        { timeout: LONG_WAIT },
      )
      .toEqual({ cellCount: 2, suppressedCount: 1, reportedCounts: [4] });
    const suppressedCell = (await _readCellProperties(page)).find(
      (properties) => {
        return properties["__avandar_state"] === "suppressed";
      },
    );
    expect(suppressedCell).not.toHaveProperty("__avandar_contributor_count");
    expect(suppressedCell).not.toHaveProperty("__avandar_value");
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await _clickSuppressedCell(page);
    const featureInspector = page.getByRole("region", {
      name: "Feature",
      exact: true,
    });
    await expect(featureInspector).toBeVisible();
    await expect(featureInspector).toContainText("suppressed");
    await expect(featureInspector).not.toContainText(
      "__avandar_contributor_count",
    );
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
