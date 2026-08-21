import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_DATED_POINTS_CSV_PATH,
  GIS_DATED_POINTS_ROW_COUNT,
  GIS_PCODE_POLYGON_CSV_PATH,
  GIS_PCODE_POLYGON_ROW_COUNT,
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

const POINT_DATASET_NAME = "dated-points.csv";
const BOUNDARY_DATASET_NAME = "pcode-polygon.csv";
const MAP_NAME = "E2E GIS buffer layer";
const BUFFER_LAYER_NAME = `Buffer of ${POINT_DATASET_NAME}`;

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

function _layerRow(page: Page, layerName: string): Locator {
  return page
    .getByRole("region", { name: "Layers" })
    .getByRole("listitem")
    .filter({
      has: page.getByText(layerName, { exact: true }),
    });
}

/**
 * MapLibre source id for a layer row, taken from the reorder control's
 * `aria-describedby` (`layer-<id>-drag-instructions`).
 */
async function _readLayerSourceId(
  row: Locator,
  layerName: string,
): Promise<string | undefined> {
  const describedBy = await row
    .getByRole("button", { name: `Reorder layer ${layerName}` })
    .getAttribute("aria-describedby");
  const prefix = "layer-";
  const suffix = "-drag-instructions";
  if (!describedBy?.startsWith(prefix) || !describedBy.endsWith(suffix)) {
    return undefined;
  }
  return `ava-map-source-${describedBy.slice(prefix.length, -suffix.length)}`;
}

/** Distinct geometry types in one GeoJSON source, or empty if it is missing. */
async function _readSourceGeometryTypes(
  page: Page,
  sourceId: string,
): Promise<string[]> {
  return page.evaluate((id) => {
    const source = window.__avandarE2EMap?.getStyle()?.sources[id];
    if (
      !source ||
      source.type !== "geojson" ||
      typeof source.data !== "object"
    ) {
      return [];
    }
    const data = source.data as GeoJSON.FeatureCollection;
    return [
      ...new Set(
        data.features.map((feature) => {
          return feature.geometry.type;
        }),
      ),
    ];
  }, sourceId);
}

function _isPolygonOnly(types: readonly string[]): boolean {
  return (
    types.length > 0 &&
    types.every((type) => {
      return type === "Polygon" || type === "MultiPolygon";
    })
  );
}

/** Geometry types on Avandar data layers currently painted by MapLibre. */
async function _readDataLayerGeometryTypes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const map = window.__avandarE2EMap;
    if (!map) {
      return [];
    }
    return [
      ...new Set(
        map
          .queryRenderedFeatures()
          .filter((feature) => {
            return feature.layer.id.startsWith("ava-map-");
          })
          .map((feature) => {
            return feature.geometry.type;
          }),
      ),
    ];
  });
}

async function _expectPolygonOnlyBuffer(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const sourceId = await _readLayerSourceId(
          _layerRow(page, BUFFER_LAYER_NAME),
          BUFFER_LAYER_NAME,
        );
        if (!sourceId) {
          return false;
        }
        return _isPolygonOnly(await _readSourceGeometryTypes(page, sourceId));
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        const types = await _readDataLayerGeometryTypes(page);
        return types.length > 0 && !types.includes("Point");
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
}

/** Binds lat/lng points to the seeded P-code boundary polygons. */
async function _bindAggregatePointsToBoundaries(
  page: Page,
  inspector: Locator,
): Promise<void> {
  const geometry = inspector.getByRole("combobox", { name: "Geometry" });
  await expect(async () => {
    if ((await geometry.getAttribute("aria-expanded")) !== "true") {
      await geometry.click();
    }
    await expect(
      page.getByRole("option", {
        name: "Aggregate points to boundaries",
        exact: true,
      }),
    ).toBeEnabled();
  }).toPass({ timeout: LONG_WAIT });
  await page
    .getByRole("option", {
      name: "Aggregate points to boundaries",
      exact: true,
    })
    .click();
  await _selectOption(
    page,
    inspector,
    "Boundary dataset",
    BOUNDARY_DATASET_NAME,
  );
  await _selectOption(page, inspector, "Boundary geometry column", "geometry");
  await _selectOption(page, inspector, "Boundary key column", "pcode");
}

test(
  "buffers aggregate-only points as polygons with no point features",
  { tag: "@online" },
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
          filePath: GIS_DATED_POINTS_CSV_PATH,
          expectedRowCount: GIS_DATED_POINTS_ROW_COUNT,
        }),
      );
      datasetIds.push(
        await importDatasetViaUi({
          page,
          workspaceSlug,
          filePath: GIS_PCODE_POLYGON_CSV_PATH,
          expectedRowCount: GIS_PCODE_POLYGON_ROW_COUNT,
        }),
      );
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      const mapRegion = page.getByRole("region", {
        name: new RegExp(MAP_NAME),
      });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: POINT_DATASET_NAME }).click();

      const inspector = page.getByRole("region", { name: "Layer" });
      await expect(inspector.getByText("9 of 9 rows mapped")).toBeVisible({
        timeout: LONG_WAIT,
      });
      await _bindAggregatePointsToBoundaries(page, inspector);
      await inspector.getByRole("button", { name: /^Sensitivity/ }).click();
      await _selectOption(page, inspector, "Handling", "Aggregate only");
      await expect(
        inspector.getByRole("combobox", { name: "Handling" }),
      ).toHaveValue("Aggregate only");
      await page
        .getByRole("button", { name: "Buffer around a layer", exact: true })
        .click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(_layerRow(page, BUFFER_LAYER_NAME)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await _expectPolygonOnlyBuffer(page);
      await expect(
        page.getByRole("status", { name: "All changes saved" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await page.reload();
      await expect(_layerRow(page, BUFFER_LAYER_NAME)).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect
        .poll(
          async () => {
            return page.evaluate(() => {
              return window.__avandarE2EMap?.loaded() === true;
            });
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);
      await _expectPolygonOnlyBuffer(page);
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      for (const datasetId of datasetIds) {
        await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
      }
    }
  },
);
