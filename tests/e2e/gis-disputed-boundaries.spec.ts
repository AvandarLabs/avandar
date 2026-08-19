import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_DISPUTED_BOUNDARIES_CSV_PATH,
  GIS_DISPUTED_BOUNDARIES_ROW_COUNT,
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

const DATASET_NAME = "disputed-boundaries.csv";
const MAP_NAME = "E2E GIS disputed boundaries";

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

/**
 * Types a value into a disputed-status values field and creates it, since
 * the field is a free-text, creatable combobox rather than a standard
 * select.
 */
async function _addDisputedValue(
  page: Page,
  scope: Locator,
  fieldLabel: string,
  value: string,
): Promise<void> {
  const field = scope.getByRole("textbox", { name: fieldLabel });
  await field.click();
  await field.fill(value);
  await page
    .getByRole("option", { name: `Create "${value}"`, exact: true })
    .click();
}

/** Reads one MapLibre layer's paint properties through the live map. */
async function _readLayerPaint(
  page: Page,
  layerIdSuffix: string,
): Promise<Record<string, unknown> | undefined> {
  return page.evaluate((suffix) => {
    const style = window.__avandarE2EMap?.getStyle();
    const layer = style?.layers?.find((candidate) => {
      return candidate.id.endsWith(suffix);
    });
    return layer && "paint" in layer ?
        (layer.paint as Record<string, unknown>)
      : undefined;
  }, layerIdSuffix);
}

test("binds a disputed-status column and renders a dashed casing and locked legend row", async ({
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
      filePath: GIS_DISPUTED_BOUNDARIES_CSV_PATH,
      expectedRowCount: GIS_DISPUTED_BOUNDARIES_ROW_COUNT,
    });
    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: DATASET_NAME }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await _selectOption(page, inspector, "Geometry", "Geometry column");
    await _selectOption(page, inspector, "Geometry column", "geometry");
    await _selectOption(page, inspector, "Encoding", "GeoJSON");
    await _selectOption(page, inspector, "Expected geometry", "Polygon");
    await expect(inspector.getByText("4 of 4 rows mapped")).toBeVisible({
      timeout: LONG_WAIT,
    });

    await _selectOption(page, inspector, "Disputed status column", "status");
    await _addDisputedValue(page, inspector, "Disputed values", "Disputed");
    await _addDisputedValue(
      page,
      inspector,
      "Undetermined values",
      "Undetermined",
    );

    const legend = page.getByRole("region", { name: "Legend" });
    await expect(
      legend.getByText("Disputed or undetermined boundary"),
    ).toBeVisible({ timeout: LONG_WAIT });

    await expect
      .poll(
        async () => {
          const paint = await _readLayerPaint(page, "-disputed-casing");
          return paint?.["line-dasharray"];
        },
        { timeout: LONG_WAIT },
      )
      .toEqual([3, 2]);

    const casingPaint = await _readLayerPaint(page, "-disputed-casing");
    const outlinePaint = await _readLayerPaint(page, "-outline");
    expect(casingPaint?.["line-color"]).not.toEqual(
      outlinePaint?.["line-color"],
    );

    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await page.reload();
    await expect(
      legend.getByText("Disputed or undetermined boundary"),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect
      .poll(
        async () => {
          const paint = await _readLayerPaint(page, "-disputed-casing");
          return paint?.["line-dasharray"];
        },
        { timeout: LONG_WAIT },
      )
      .toEqual([3, 2]);
    const reloadedCasingPaint = await _readLayerPaint(page, "-disputed-casing");
    const reloadedOutlinePaint = await _readLayerPaint(page, "-outline");
    expect(reloadedCasingPaint?.["line-color"]).not.toEqual(
      reloadedOutlinePaint?.["line-color"],
    );
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    if (datasetId) {
      await deleteDatasetAndShares({
        supabaseAdminClient: admin,
        datasetId,
      });
    }
  }
});
