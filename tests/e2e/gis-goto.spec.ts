import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
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

const DATASET_NAME = "pcode-polygon.csv";
const MAP_NAME = "E2E GIS go to";
const SEEDED_PCODE = "WD-10";

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

async function _readMapCenter(
  page: Page,
): Promise<{ lng: number; lat: number } | undefined> {
  return page.evaluate(() => {
    const center = window.__avandarE2EMap?.getCenter();
    if (!center) {
      return undefined;
    }
    return { lng: center.lng, lat: center.lat };
  });
}

async function _submitGoTo(page: Page, query: string): Promise<void> {
  const field = page.getByRole("textbox", {
    name: "Go to a coordinate or P-code",
  });
  await expect(async () => {
    await field.fill(query);
    await expect(field).toHaveValue(query);
  }).toPass({ timeout: MEDIUM_WAIT });
  await field.press("Enter");
}

test(
  "flies the camera to a coordinate and a seeded P-code",
  { tag: "@online" },
  async ({ page, e2eWorkerDb }) => {
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
        filePath: GIS_PCODE_POLYGON_CSV_PATH,
        expectedRowCount: GIS_PCODE_POLYGON_ROW_COUNT,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      const mapRegion = page.getByRole("region", {
        name: new RegExp(MAP_NAME),
      });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: DATASET_NAME }).click();

      const inspector = page.getByRole("region", { name: "Layer" });
      const geometry = inspector.getByRole("combobox", { name: "Geometry" });
      await expect(async () => {
        if ((await geometry.getAttribute("aria-expanded")) !== "true") {
          await geometry.click();
        }
        await expect(
          page.getByRole("option", { name: "Join to boundaries", exact: true }),
        ).toBeEnabled();
      }).toPass({ timeout: LONG_WAIT });
      await page
        .getByRole("option", { name: "Join to boundaries", exact: true })
        .click();
      await _selectOption(page, inspector, "Data key column", "pcode");
      await _selectOption(page, inspector, "Boundary dataset", DATASET_NAME);
      await _selectOption(
        page,
        inspector,
        "Boundary geometry column",
        "geometry",
      );
      await _selectOption(page, inspector, "Boundary key column", "pcode");
      await _selectOption(page, inspector, "Boundary display name", "pcode");
      await _selectOption(page, inspector, "Matching", "Exact");
      await _selectOption(page, inspector, "Aggregation", "Count");
      await expect(
        inspector.getByRole("button", { name: "Review matches" }),
      ).toBeVisible({ timeout: LONG_WAIT });

      await _submitGoTo(page, "-120, 0");
      await expect
        .poll(
          async () => {
            const center = await _readMapCenter(page);
            return (
              center !== undefined &&
              Math.abs(center.lng - -120) < 1 &&
              Math.abs(center.lat - 0) < 1
            );
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);

      await _submitGoTo(page, "10, 10");
      await expect
        .poll(
          async () => {
            const center = await _readMapCenter(page);
            return (
              center !== undefined &&
              Math.abs(center.lng - 10) < 0.2 &&
              Math.abs(center.lat - 10) < 0.2
            );
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);

      await _submitGoTo(page, "-120, 0");
      await expect
        .poll(
          async () => {
            const center = await _readMapCenter(page);
            return (
              center !== undefined &&
              Math.abs(center.lng - -120) < 1 &&
              Math.abs(center.lat - 0) < 1
            );
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);
      await _submitGoTo(page, SEEDED_PCODE);
      await expect
        .poll(
          async () => {
            const center = await _readMapCenter(page);
            return (
              center !== undefined &&
              Math.abs(center.lng - 10) < 1 &&
              Math.abs(center.lat - 10) < 1
            );
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      if (datasetId) {
        await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
      }
    }
  },
);
