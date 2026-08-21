import { expect, test } from "./fixtures/e2e.fixture";
import {
  expect as viewerExpect,
  test as viewerMembershipTest,
} from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  createRolesMatrixWithoutApp,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
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

const DATASET_NAME = "small-california-covid-sample.csv";
const MAP_NAME = "E2E California response";
const KNOWN_FEATURE_COORDINATE = [-121.8929271, 37.64629437] as const;

/** Escapes a layer name before using it as an accessible-name prefix. */
function _buildLayerButtonNamePattern(layerName: string): RegExp {
  const escapedName = layerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedName}(?:\\s|$)`);
}

/** Returns one layer stack item using its select button as the row identity. */
function _layerRow(
  options: Readonly<{ page: Page; layerName: string }>,
): Locator {
  const { page, layerName } = options;
  const layersPanel = page.getByRole("region", { name: "Layers" });
  return layersPanel.getByRole("listitem").filter({
    has: page.getByText(layerName, { exact: true }),
  });
}

/** Projects the known Alameda CSV coordinate through the app's MapLibre map. */
async function _projectKnownFeature(
  page: Page,
): Promise<{ x: number; y: number }> {
  return page.evaluate((coordinate) => {
    const map = window.__avandarE2EMap;
    if (!map) {
      throw new Error(
        "MapLibre is not exposed as window.__avandarE2EMap for the E2E feature click.",
      );
    }
    return map.project([coordinate[0], coordinate[1]]);
  }, KNOWN_FEATURE_COORDINATE);
}

/** Clicks the coordinate returned by the live MapLibre projection. */
async function _clickKnownFeature(page: Page): Promise<void> {
  const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
  const mapCanvas = mapRegion.locator(".maplibregl-canvas");
  const [projectedCoordinate, canvasBounds] = await Promise.all([
    _projectKnownFeature(page),
    mapCanvas.boundingBox(),
  ]);
  if (!canvasBounds) {
    throw new Error(
      "MapLibre canvas was not visible for the E2E feature click.",
    );
  }
  await page.mouse.click(
    canvasBounds.x + projectedCoordinate.x,
    canvasBounds.y + projectedCoordinate.y,
  );
}

test.describe("GIS map layers", () => {
  test(
    "adds a layer, shows its data, and survives a reload",
    { tag: "@online" },
    async ({ page, e2eWorkerDb }) => {
      const admin = createSupabaseAdminClient();
      const { primaryUser, workspaceSlug } = e2eWorkerDb;
      const seededMapIds: string[] = [];
      let datasetId = "";

      try {
        const workspaceId = await getWorkspaceIdBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
        });
        const mapId = await seedAvaMap({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          name: MAP_NAME,
        });
        seededMapIds.push(mapId);

        await signInWithEmailPassword(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });
        await importDatasetViaUi({
          page,
          workspaceSlug,
          filePath: SMALL_CALIFORNIA_CSV_PATH,
          expectedRowCount: SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
          onDatasetCreated: (createdDatasetId) => {
            datasetId = createdDatasetId;
          },
        });

        await page.getByRole("link", { name: "Maps" }).click();
        await page
          .getByRole("link", { name: `Open the map ${MAP_NAME}` })
          .click();

        const mapRegion = page.getByRole("region", {
          name: new RegExp(MAP_NAME),
        });
        await expect(mapRegion).toBeVisible();
        await mapRegion.getByRole("button", { name: "Add a layer" }).click();
        await page.getByPlaceholder("Search data sources").click();
        await page.getByRole("option", { name: DATASET_NAME }).click();

        const layerRow = _layerRow({ page, layerName: DATASET_NAME });
        await expect(layerRow).toBeVisible({ timeout: MEDIUM_WAIT });

        const layerInspector = page.getByRole("region", { name: "Layer" });
        await expect(
          layerInspector.getByRole("button", { name: "Latitude" }),
        ).toBeVisible();
        await expect(
          layerInspector.getByRole("button", { name: "Longitude" }),
        ).toBeVisible();

        await expect(layerRow).toContainText("3 rows unmapped", {
          timeout: LONG_WAIT,
        });
        await expect(
          page.getByRole("status", { name: "All changes saved" }),
        ).toBeVisible({ timeout: MEDIUM_WAIT });

        await page.reload();
        await expect(
          _layerRow({ page, layerName: DATASET_NAME }),
        ).toContainText("3 rows unmapped", {
          timeout: LONG_WAIT,
        });
        await expect(
          page.getByRole("textbox", { name: "Map name" }),
        ).toHaveValue(MAP_NAME);

        await page.getByRole("button", { name: "Basemap" }).click();
        await page.getByRole("menuitem", { name: "Positron" }).click();
        await expect(
          _layerRow({ page, layerName: DATASET_NAME }),
        ).toContainText("3 rows unmapped", { timeout: MEDIUM_WAIT });

        await page
          .getByRole("button", {
            name: `More actions for the layer ${DATASET_NAME}`,
          })
          .click();
        await page.getByRole("menuitem", { name: "Duplicate" }).click();

        const layersPanel = page.getByRole("region", { name: "Layers" });
        const duplicatedLayerRow = _layerRow({
          page,
          layerName: `${DATASET_NAME} copy`,
        });
        await expect(duplicatedLayerRow).toBeVisible({ timeout: MEDIUM_WAIT });
        await expect(layersPanel.getByRole("listitem")).toHaveCount(2);
        await expect(duplicatedLayerRow).toContainText("3 rows unmapped", {
          timeout: LONG_WAIT,
        });
        const rowsBefore = await layersPanel
          .getByRole("listitem")
          .allInnerTexts();
        await duplicatedLayerRow
          .getByRole("button", {
            name: _buildLayerButtonNamePattern(`${DATASET_NAME} copy`),
          })
          .focus();
        await page.keyboard.press("Alt+ArrowDown");
        await expect
          .poll(async () => {
            return layersPanel.getByRole("listitem").allInnerTexts();
          })
          .toEqual([...rowsBefore].reverse());

        await _clickKnownFeature(page);
        await expect(
          page.getByRole("region", { name: "Feature", exact: true }),
        ).toContainText("Admin2");
        await expect(
          page.getByRole("region", { name: "Feature", exact: true }),
        ).toContainText("Alameda");
      } finally {
        await deleteMapsByIds({ admin, mapIds: seededMapIds });
        if (datasetId) {
          await deleteDatasetAndShares({
            supabaseAdminClient: admin,
            datasetId,
          });
        }
      }
    },
  );

  test("keeps map reading available on a narrow screen", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { primaryUser, workspaceSlug } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const mapId = await seedAvaMap({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    try {
      await page.setViewportSize({ width: 500, height: 800 });
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/map/${mapId}`);

      await expect(
        page.getByRole("region", { name: new RegExp(MAP_NAME) }),
      ).toBeVisible();
      await expect(
        page.getByText("Viewing only on this screen size."),
      ).toBeVisible();
      await expect(page.getByRole("region", { name: "Layers" })).toHaveCount(0);
      await expect(page.getByTestId("map-furniture-bar")).toBeVisible();
    } finally {
      await deleteMapsByIds({ admin, mapIds: [mapId] });
    }
  });

  viewerMembershipTest(
    "a member with no GIS role cannot reach a map",
    async ({ page, e2eWorkerDb, e2eViewerMembership }) => {
      const { admin, viewerUserId, workspaceId } = e2eViewerMembership;
      const { primaryUser, secondaryUser, workspaceSlug } = e2eWorkerDb;
      const seededMapIds: string[] = [];
      let roleAssignment:
        | Awaited<ReturnType<typeof assignE2ESecondaryMemberCustomMatrix>>
        | undefined;

      try {
        roleAssignment = await assignE2ESecondaryMemberCustomMatrix({
          supabaseAdminClient: admin,
          workspaceId,
          viewerUserId,
          matrix: createRolesMatrixWithoutApp("gis"),
        });
        const mapId = await seedAvaMap({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          name: "E2E GIS access gate",
        });
        seededMapIds.push(mapId);

        await signInWithEmailPassword(page, {
          email: secondaryUser.email,
          password: secondaryUser.password,
          workspaceSlug,
        });
        await viewerExpect(
          page.getByRole("link", { name: "Maps" }),
        ).toHaveCount(0);

        await page.goto(`/${workspaceSlug}/map/${mapId}`);
        await viewerExpect(page).toHaveURL(
          new RegExp(`/${workspaceSlug}/access-denied\\?app=Maps`),
          { timeout: MEDIUM_WAIT },
        );
        await viewerExpect(
          page.getByRole("heading", { name: "Access denied", level: 2 }),
        ).toBeVisible();
      } finally {
        await deleteMapsByIds({ admin, mapIds: seededMapIds });
        if (roleAssignment) {
          await restoreE2ESecondaryMemberRoleGroup({
            supabaseAdminClient: admin,
            workspaceId,
            viewerUserId,
            ...roleAssignment,
          });
        }
      }
    },
  );
});
