/*
 * A publicly published dashboard, opened by a visitor with no session, runs
 * its chart's query against the published snapshot and shows the rows.
 *
 * The chart reads a column the owner renamed, and the dataset is published
 * whole. A whole-dataset snapshot used to be a copy of the stored upload,
 * which keeps the original column name, so this pins that the snapshot is
 * published with the name the chart's query uses.
 *
 * The dataset is imported and its column renamed in `beforeAll`, in a browser
 * context of its own, so the session under test starts after both exist.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { createDashboardWithDataVizBlock } from "./helpers/createDashboardWithDataVizBlock";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { openShareModal } from "./helpers/shareModalFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Page } from "@playwright/test";

const ORIGINAL_COLUMN_NAME = "Admin2";
const RENAMED_COLUMN_NAME = "County";
const PUBLIC_SNAPSHOT_BUCKET = "published";
/** The first three counties of the sample, in name order. */
const EXPECTED_COUNTIES = ["Alameda", "Alpine", "Amador"] as const;

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
} = { workspaceId: undefined, datasetId: undefined };

/** Renames one column from the dataset page's column table. */
async function _renameColumn(
  options: Readonly<{ page: Page; fromName: string; toName: string }>,
): Promise<void> {
  const { page } = options;
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: options.fromName, exact: true }),
    })
    .getByRole("button", { name: "Edit" })
    .click();
  // Editing turns the name cell into a textbox, so the row is found again by
  // the Save button only the row being edited shows.
  const editingRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "Save" }) });
  // The name is the row's first editable field.
  await editingRow.getByRole("textbox").first().fill(options.toName);
  await editingRow.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText("Column description updated successfully!"),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Publishes the open dashboard to the web with its one dataset published
 * whole, through the share modal.
 */
async function _publishWholeDatasetPublicly(
  options: Readonly<{ page: Page; datasetName: string }>,
): Promise<void> {
  const { page } = options;
  await openShareModal(page);
  const dialog = page.getByRole("dialog", { name: /^Share / });
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Anyone with the link" }).click();

  await dialog.getByRole("button", { name: "Advanced options" }).click();
  await dialog.getByRole("button", { name: options.datasetName }).click();
  await dialog.getByRole("radio", { name: "Whole dataset" }).check();

  // The seeded dashboard carries a slug, and publishing waits on the server's
  // answer to the custom URL check, the way a user waits for its tick.
  await expect(dialog.getByLabel("Custom URL is available")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await dialog.getByRole("button", { name: "Publish publicly" }).click();
  await expect(dialog).toContainText("This dashboard is public", {
    timeout: LONG_WAIT,
  });
}

/**
 * Removes a dashboard and the snapshot objects its public publish uploaded.
 * Deleting the row does not remove Storage objects.
 */
async function _deletePublishedDashboard(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    dashboardId: string | undefined;
  }>,
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
    const datasetsFolder = `dashboards/${dashboardId}/revisions/${dashboard.snapshot_revision}/datasets`;
    const { data: objects } = await admin.storage
      .from(PUBLIC_SNAPSHOT_BUCKET)
      .list(datasetsFolder);
    const objectPaths = (objects ?? []).map((object) => {
      return `${datasetsFolder}/${object.name}`;
    });
    if (objectPaths.length > 0) {
      await admin.storage.from(PUBLIC_SNAPSHOT_BUCKET).remove(objectPaths);
    }
  }
  await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
}

test.describe("public dashboard link", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
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
        filePath: SMALL_CALIFORNIA_CSV_PATH,
        expectedRowCount: SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug,
        onDatasetCreated: (datasetId) => {
          seededWorld.datasetId = datasetId;
        },
      });
      await _renameColumn({
        page,
        fromName: ORIGINAL_COLUMN_NAME,
        toName: RENAMED_COLUMN_NAME,
      });
    } finally {
      await context.close();
    }
  });

  test.afterAll(async () => {
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin: createSupabaseAdminClient(),
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("a signed-out visitor sees the rows of a chart that reads a renamed column", async ({
    browser,
    page,
    e2eWorkerDb,
  }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const { datasetId, workspaceId } = seededWorld;
    if (!datasetId || !workspaceId) {
      throw new Error("beforeAll did not import the dataset.");
    }
    const { data: dataset } = await admin
      .from("datasets")
      .select("name")
      .eq("id", datasetId)
      .single()
      .throwOnError();
    let dashboardId: string | undefined;

    try {
      dashboardId = await createDashboardWithDataVizBlock({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: "E2E public link data",
        rawSql: `SELECT DISTINCT "${RENAMED_COLUMN_NAME}" FROM "${datasetId}" ORDER BY 1 LIMIT ${EXPECTED_COUNTIES.length}`,
        vizConfig: { vizType: "table" },
      });

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await _publishWholeDatasetPublicly({ page, datasetName: dataset.name });

      const visitorContext = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        reducedMotion: "reduce",
      });
      await installDuckDbExtensionCache(visitorContext);
      try {
        const visitorPage = await visitorContext.newPage();
        await visitorPage.goto(`/d/${dashboardId}`, {
          waitUntil: "domcontentloaded",
        });
        await expect(
          visitorPage.getByText(EXPECTED_COUNTIES[0], { exact: true }),
        ).toBeVisible({ timeout: LONG_WAIT });
        for (const county of EXPECTED_COUNTIES) {
          await expect(
            visitorPage.getByText(county, { exact: true }),
          ).toBeVisible();
        }
        await expect(
          visitorPage.getByText("This query could not run"),
        ).toHaveCount(0);
      } finally {
        await visitorContext.close();
      }
    } finally {
      await _deletePublishedDashboard({ admin, dashboardId });
    }
  });
});
