/*
 * A map added to a dashboard from the GIS export sheet renders live for a
 * workspace member. Published to the web, the same kind of dashboard shows a
 * signed-out visitor the map's rendered output: points displaced, no dataset
 * downloaded.
 *
 * The dataset, the map, and its displaced point layer are built in
 * `beforeAll`, in a browser context of its own, because they are
 * preconditions rather than the behavior under test.
 */
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword, switchToWorkspaceUser } from "./helpers/auth";
import {
  GIS_LAT_LNG_POINTS_CSV_PATH,
  GIS_LAT_LNG_POINTS_ROW_COUNT,
} from "./helpers/constants";
import { DashboardSeedHelpers } from "./helpers/DashboardSeedHelpers";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import {
  closeShareModal,
  openShareModal,
  setGeneralAccess,
} from "./helpers/shareModalFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

const DATASET_NAME = "lat-lng-points.csv";
const MAP_NAME = "E2E map block";
const PUBLIC_SNAPSHOT_BUCKET = "published";

/** The fixture's eight points, `[longitude, latitude]`. */
const SOURCE_COORDINATES: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.5],
  [0.7, 0.7],
  [0.9, 0.9],
  [1.1, 1.1],
  [1.3, 1.3],
  [2.5, 0.5],
  [4.5, 0.5],
  [2.7, 0.7],
];

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  mapId: string | undefined;
  datasetId: string | undefined;
} = { workspaceId: undefined, mapId: undefined, datasetId: undefined };

/** Every point coordinate in the page's map sources. */
async function _readRenderedPoints(
  page: Page,
): Promise<Array<[number, number]>> {
  return page.evaluate(() => {
    const sources = window.__avandarE2EMap?.getStyle()?.sources ?? {};
    return Object.values(sources).flatMap((source) => {
      if (source.type !== "geojson" || typeof source.data !== "object") {
        return [];
      }
      const data = source.data as GeoJSON.FeatureCollection;
      return data.features.flatMap((feature) => {
        return feature.geometry.type === "Point"
          ? [
              [
                feature.geometry.coordinates[0]!,
                feature.geometry.coordinates[1]!,
              ] as [number, number],
            ]
          : [];
      });
    });
  });
}

/** Waits until the page's map draws one point per fixture row. */
async function _expectAllPointsRendered(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        return (await _readRenderedPoints(page)).length;
      },
      { timeout: LONG_WAIT },
    )
    .toBe(SOURCE_COORDINATES.length);
}

function _isSourceCoordinate(coordinate: readonly [number, number]): boolean {
  return SOURCE_COORDINATES.some(([longitude, latitude]) => {
    return (
      Math.abs(coordinate[0] - longitude) < 1e-9 &&
      Math.abs(coordinate[1] - latitude) < 1e-9
    );
  });
}

/** Adds the dataset as a layer and sets its handling to Displace. */
async function _buildDisplacedPointLayer(page: Page): Promise<void> {
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
  await inspector.getByRole("button", { name: /^Sensitivity/ }).click();
  await inspector.getByRole("combobox", { name: "Handling" }).click();
  await page.getByRole("option", { name: "Displace" }).click();
  await expect(
    page.getByRole("status", { name: "All changes saved" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** Removes a dashboard, its shares, and its published map snapshots. */
async function _deleteDashboard(
  options: Readonly<{ admin: SupabaseClient; dashboardId: string | undefined }>,
): Promise<void> {
  const { admin, dashboardId } = options;
  if (dashboardId === undefined) {
    return;
  }
  const { data: dashboard } = await admin
    .from("dashboards")
    .select("snapshot_revision")
    .eq("id", dashboardId)
    .maybeSingle();
  if (dashboard?.snapshot_revision) {
    const mapsFolder = `dashboards/${dashboardId}/revisions/${dashboard.snapshot_revision}/maps`;
    const { data: objects } = await admin.storage
      .from(PUBLIC_SNAPSHOT_BUCKET)
      .list(mapsFolder);
    const objectPaths = (objects ?? []).map((object) => {
      return `${mapsFolder}/${object.name}`;
    });
    if (objectPaths.length > 0) {
      await admin.storage.from(PUBLIC_SNAPSHOT_BUCKET).remove(objectPaths);
    }
  }
  await admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .eq("resource_id", dashboardId);
  await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
}

/** Inserts a draft dashboard whose only block shows the seeded map. */
async function _seedMapDashboard(
  options: Readonly<{
    admin: SupabaseClient;
    mapId: string;
    ownerEmail: string;
    workspaceId: string;
  }>,
): Promise<string> {
  const { admin, mapId, ownerEmail, workspaceId } = options;
  const owner = await DashboardSeedHelpers.getOwner({
    admin,
    ownerEmail,
    workspaceId,
  });
  return DashboardSeedHelpers.insertDashboard({
    admin,
    config: DashboardSeedHelpers.makeDashboardConfigFromContent({
      content: [
        {
          type: "Map",
          props: {
            id: "Map-e2e",
            mapId,
            view: { type: "saved" },
            heightPx: 420,
            showLegend: true,
            isInteractive: true,
          },
        },
      ],
      title: "E2E public map",
    }),
    failureMessage: "Failed to seed the map dashboard",
    isRestricted: false,
    missingRowMessage: "Map dashboard seed returned no row",
    name: "E2E public map",
    owner,
    slug: `e2e-map-${crypto.randomUUID().slice(0, 8)}`,
    workspaceId,
    visibility: "draft",
  });
}

test.describe("dashboard map block", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    seededWorld.mapId = await seedAvaMap({
      admin,
      workspaceId: seededWorld.workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      reducedMotion: "reduce",
    });
    await installDuckDbExtensionCache(context);
    try {
      const page = await context.newPage();
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_LAT_LNG_POINTS_CSV_PATH,
        expectedRowCount: GIS_LAT_LNG_POINTS_ROW_COUNT,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
      await _buildDisplacedPointLayer(page);
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    await deleteMapsByIds({
      admin,
      mapIds: seededWorld.mapId ? [seededWorld.mapId] : [],
    });
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("a workspace member sees the live map added from the export sheet", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    let dashboardId: string | undefined;
    try {
      // No dashboards, so the modal opens straight on "create".
      await deleteAllDashboardsForOwner({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
      });
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await page
        .getByRole("dialog", { name: "Export" })
        .getByRole("button", { name: "Add to dashboard" })
        .click();
      const addDialog = page.getByRole("dialog", { name: "Add to dashboard" });
      await addDialog
        .getByRole("textbox", { name: "Dashboard name" })
        .fill("E2E coverage dashboard");
      await addDialog
        .getByRole("button", { name: "Create dashboard & save" })
        .click();
      await page.getByText("Open dashboard").click();
      await expect(page).toHaveURL(/\/dashboards\/edit\//, {
        timeout: LONG_WAIT,
      });
      dashboardId = parseDashboardIdFromEditorUrl(page.url());

      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(
        editorFrame.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(
        editorFrame.getByText("Dashboard filters don't apply to this map yet."),
      ).toBeVisible();

      await openShareModal(page);
      await setGeneralAccess(page, "Workspace", "viewer");
      const shareDialog = page.getByRole("dialog", { name: /^Share / });
      await shareDialog
        .getByRole("button", { name: "Publish to workspace" })
        .click();
      await expect(shareDialog).toContainText(
        "This dashboard is published to your workspace",
        { timeout: LONG_WAIT },
      );
      await closeShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await _expectAllPointsRendered(page);
    } finally {
      await _deleteDashboard({ admin, dashboardId });
    }
  });

  test("a signed-out visitor sees the published map's displaced points and no dataset", async ({
    browser,
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }, testInfo) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const mapId = seededWorld.mapId;
    if (!mapId) {
      throw new Error("beforeAll did not seed the map.");
    }
    let dashboardId: string | undefined;
    const visitorContext = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    try {
      dashboardId = await _seedMapDashboard({
        admin,
        mapId,
        ownerEmail: primaryUser.email,
        workspaceId,
      });

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await openShareModal(page);
      const shareDialog = page.getByRole("dialog", { name: /^Share / });
      await shareDialog
        .getByRole("combobox", { name: "General access" })
        .click();
      await page.getByRole("option", { name: "Anyone with the link" }).click();
      await shareDialog
        .getByRole("button", { name: "Advanced options" })
        .click();
      await expect(shareDialog).toContainText(`${DATASET_NAME}: 8 features`, {
        timeout: LONG_WAIT,
      });
      await expect(
        shareDialog.getByLabel("Custom URL is available"),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await shareDialog
        .getByRole("button", { name: "Publish publicly" })
        .click();
      await expect(shareDialog).toContainText("This dashboard is public", {
        timeout: LONG_WAIT,
      });

      await installDuckDbExtensionCache(visitorContext);
      const visitor = await visitorContext.newPage();
      const storageRequestUrls: string[] = [];
      visitor.on("request", (request) => {
        if (request.url().includes("/storage/v1/object/")) {
          storageRequestUrls.push(request.url());
        }
      });
      await visitor.goto(`/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        visitor.getByRole("region", { name: `Map of ${MAP_NAME}` }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await _expectAllPointsRendered(visitor);

      const publicPoints = await _readRenderedPoints(visitor);
      expect(publicPoints.filter(_isSourceCoordinate)).toEqual([]);
      expect(
        storageRequestUrls.some((url) => {
          return url.includes(`/maps/${mapId}.json`);
        }),
      ).toBe(true);
      expect(
        storageRequestUrls.filter((url) => {
          return url.includes("/datasets/");
        }),
      ).toEqual([]);
    } finally {
      await visitorContext.close();
      await _deleteDashboard({ admin, dashboardId });
    }
  });
});
