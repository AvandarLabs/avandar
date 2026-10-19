import { objectKeys } from "@avandar/utils";
import { getDatasetRefreshFromSourceType } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";
import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword, switchToWorkspaceUser } from "./helpers/auth";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { LiveConnectorE2eRegistry } from "./helpers/liveConnectors/LiveConnectorE2eRegistry";
import { LiveDatasetDashboardFlow } from "./helpers/liveConnectors/LiveDatasetDashboardFlow";
import { LiveSourceTable } from "./helpers/liveConnectors/LiveSourceTable";
import { deleteAllDashboardsForOwner } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerDb } from "./fixtures/e2e.fixture";
import type {
  ImportedLiveDataset,
  LiveConnectorE2e,
  LiveConnectorSession,
} from "./helpers/liveConnectors/LiveConnectorE2e.types";
import type { Page } from "@playwright/test";

/**
 * Every live connector, held to the same end-to-end checks. A live source's
 * rows can change without anyone re-importing it, and every connector shipped
 * so far broke in the same places past its import: its columns arrived as
 * text, its rows never refreshed, only its importer could read it, and its
 * dashboards failed once published. Each check below runs once per live
 * source type in `LiveConnectorE2eRegistry`, so a new connector is covered
 * by adding its entry.
 *
 * Each connector's stubs sit at the browser's network boundary: Google's
 * endpoints for a sheet's import, and our own edge function's routes for
 * everything else. Those routes read the source on the server with the
 * importer's credential, where `page.route` cannot reach, so who may read
 * through them is covered by their route tests instead. Here, the UI, the
 * client, DuckDB and the dashboards all run for real.
 */

/** What every check needs besides the connector itself. */
type LiveConnectorTestContext = Readonly<{
  page: Page;
  e2eWorkerDb: E2EWorkerDb;
  admin: AvaSupabaseDBClient;
  workspaceId: string;
  session: LiveConnectorSession;
}>;

/**
 * Matches a grid cell showing a whole number, which the grids render with
 * two decimal places.
 */
function _makeWholeNumberCellName(value: number): RegExp {
  return new RegExp(`^${value}(\\.0+)?$`);
}

/** The query a dashboard over the source table runs. */
function _makeDashboardSql(datasetId: string): string {
  return `SELECT region, cases FROM "${datasetId}" ORDER BY region`;
}

/**
 * Installs the connector, signs in as the importer, runs `body`, and removes
 * everything the connector created, even when `body` fails.
 */
async function _withLiveConnector(
  options: Readonly<{
    page: Page;
    e2eWorkerDb: E2EWorkerDb;
    connector: LiveConnectorE2e;
  }>,
  body: (context: LiveConnectorTestContext) => Promise<void>,
): Promise<void> {
  const { page, e2eWorkerDb } = options;
  const admin = createSupabaseAdminClient();
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient: admin,
    slug: e2eWorkerDb.workspaceSlug,
  });
  const session = await options.connector.install({
    page,
    e2eWorkerDb,
    admin,
    workspaceId,
  });
  try {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await body({ page, e2eWorkerDb, admin, workspaceId, session });
  } finally {
    await session.cleanUp();
  }
}

/**
 * Asserts a column's Data Summary section shows its type, and a figure only a
 * summary of that type computes. A number summary averages the column, which
 * fails outright on a text column.
 */
async function _expectColumnSummary(
  options: Readonly<{
    page: Page;
    columnName: string;
    typeLabel: string;
    expectedFigure: string;
  }>,
): Promise<void> {
  const { page, columnName } = options;
  const section = page.locator("section").filter({
    has: page.getByRole("heading", { name: columnName, exact: true }),
  });
  // Sections load their summary only once scrolled near the viewport.
  await section.scrollIntoViewIfNeeded();
  await expect(section).toContainText(options.typeLabel);
  await expect(section).toContainText(options.expectedFigure, {
    timeout: LONG_WAIT,
  });
  await expect(section).not.toContainText("Could not summarize");
}

/**
 * Builds a dashboard over the dataset through the Data Explorer, publishes it
 * to the workspace with `sliceLabel`, and opens its published link after the
 * source has changed, asserting it still shows the published rows.
 */
async function _expectPublishedDashboardKeepsRows(
  options: Readonly<{
    context: LiveConnectorTestContext;
    dataset: ImportedLiveDataset;
    sliceLabel: "Whole dataset" | "Only what's queried (recommended)";
  }>,
): Promise<void> {
  const { context, dataset } = options;
  const { page, admin, workspaceId, e2eWorkerDb } = context;
  const dashboardName = `E2E live publish ${dataset.datasetName}`;
  let dashboardId: string | undefined;
  try {
    await LiveDatasetDashboardFlow.saveQueryToNewDashboard({
      page,
      dataset,
      dashboardName,
      sql: _makeDashboardSql(dataset.datasetId),
      firstColumnName: "region",
      expectedCellText: "Highlands",
    });
    dashboardId = await LiveDatasetDashboardFlow.openDashboardEditor({
      page,
      dashboardName,
    });
    await LiveDatasetDashboardFlow.publishToWorkspace({
      page,
      dataset,
      sliceLabel: options.sliceLabel,
    });

    // The source changes after publishing, and a cold load of the link an
    // owner would paste still shows what was published: the viewer reads the
    // uploaded snapshot, never the live source.
    context.session.setSourceRows(LiveSourceTable.rowsAfterEdit);
    await page.goto(`/${e2eWorkerDb.workspaceSlug}/d/${dashboardId}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("gridcell", { name: "Highlands", exact: true }),
    ).toBeVisible({ timeout: LONG_WAIT });
    await expect(
      page.getByRole("gridcell", { name: _makeWholeNumberCellName(450) }),
    ).toBeVisible();
    await expect(
      page.getByRole("gridcell", { name: _makeWholeNumberCellName(999) }),
    ).toHaveCount(0);
  } finally {
    if (dashboardId !== undefined) {
      await LiveDatasetDashboardFlow.removePublishedSnapshots({
        admin,
        dashboardId,
      });
    }
    await deleteAllDashboardsForOwner({
      admin,
      workspaceId,
      ownerEmail: e2eWorkerDb.primaryUser.email,
    });
  }
}

test.describe("live connector registry", () => {
  test("drives exactly the source types that offer a manual refresh", () => {
    objectKeys(LiveConnectorE2eRegistry.bySourceType).forEach((sourceType) => {
      const isDrivenAsLive =
        LiveConnectorE2eRegistry.bySourceType[sourceType] !== "not-live";
      expect(isDrivenAsLive, sourceType).toBe(
        getDatasetRefreshFromSourceType(sourceType) !== undefined,
      );
    });
  });
});

LiveConnectorE2eRegistry.getLiveConnectors().forEach(
  ([sourceType, connector]) => {
    test.describe(`${sourceType} live dataset`, () => {
      test("types a whole-number and a date column as numbers and dates", async ({
        page,
        e2eWorkerDb,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async ({ session }) => {
            const dataset = await session.importDataset(page);

            await page.getByRole("tab", { name: "Data Summary" }).click();
            await _expectColumnSummary({
              page,
              columnName: "cases",
              typeLabel: "Whole number",
              expectedFigure: "450",
            });
            await _expectColumnSummary({
              page,
              columnName: "reported_on",
              typeLabel: "Date",
              expectedFigure: "2026-01-05",
            });

            // What DuckDB holds, which the summary's labels alone cannot
            // show: a date summary casts its column to a date itself.
            await runSqlOverDataset({
              page,
              datasetName: dataset.datasetName,
              columnName: "region",
              sql: `SELECT typeof(cases) AS cases_type, typeof(reported_on) AS reported_on_type FROM "${dataset.datasetId}" LIMIT 1`,
            });
            await expect(page.getByRole("gridcell")).toHaveText(
              ["BIGINT", "DATE"],
              { timeout: LONG_WAIT },
            );
          },
        );
      });

      test("shows a changed source row after a refresh", async ({
        page,
        e2eWorkerDb,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async ({ session }) => {
            await session.importDataset(page);
            await expect(
              page.getByRole("gridcell", {
                name: _makeWholeNumberCellName(450),
              }),
            ).toBeVisible({ timeout: LONG_WAIT });

            // The summary's queries never go stale on their own, so it only
            // shows the edit if the refresh re-runs them.
            await page.getByRole("tab", { name: "Data Summary" }).click();
            await _expectColumnSummary({
              page,
              columnName: "cases",
              typeLabel: "Whole number",
              expectedFigure: "450",
            });

            session.setSourceRows(LiveSourceTable.rowsAfterEdit);
            await page
              .getByRole("button", { name: "More dataset actions" })
              .click();
            await page
              .getByRole("menuitem", { name: connector.refreshMenuItemName })
              .click();
            await expect(
              page.getByText(connector.refreshedNotificationTitle),
            ).toBeVisible({ timeout: LONG_WAIT });

            await _expectColumnSummary({
              page,
              columnName: "cases",
              typeLabel: "Whole number",
              expectedFigure: "999",
            });
            await page.getByRole("tab", { name: "Metadata" }).click();
            await expect(
              page.getByRole("gridcell", {
                name: _makeWholeNumberCellName(999),
              }),
            ).toBeVisible({ timeout: LONG_WAIT });
            await expect(
              page.getByRole("gridcell", {
                name: _makeWholeNumberCellName(450),
              }),
            ).toHaveCount(0);
          },
        );
      });

      // Requesting `e2eViewerMembership` is what makes the secondary user a
      // Global Viewer member of the workspace for this test.
      test("lets a member who did not import it read its rows", async ({
        page,
        e2eWorkerDb,
        e2eViewerMembership: _viewerMembership,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async ({ session }) => {
            const dataset = await session.importDataset(page);
            const readCountBeforeSwitch = session.getDatasetReadUrls().length;

            await switchToWorkspaceUser(page, {
              email: e2eWorkerDb.secondaryUser.email,
              password: e2eWorkerDb.secondaryUser.password,
              workspaceSlug: e2eWorkerDb.workspaceSlug,
            });
            await page.getByRole("link", { name: "Data Sources" }).click();
            await page
              .getByRole("link", { name: dataset.datasetName, exact: true })
              .click();
            await expect(
              page.getByRole("gridcell", { name: "Highlands", exact: true }),
            ).toBeVisible({ timeout: LONG_WAIT });

            // The member's rows came through the dataset's own route, the one
            // that reads with the importer's credential, rather than through
            // a credential of the member's own.
            const memberReadUrls = session
              .getDatasetReadUrls()
              .slice(readCountBeforeSwitch);
            expect(memberReadUrls.length).toBeGreaterThan(0);
            memberReadUrls.forEach((url) => {
              expect(url).toContain(`/datasets/${dataset.datasetId}/`);
            });
          },
        );
      });

      test("renders its rows in a dashboard widget", async ({
        page,
        e2eWorkerDb,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async ({ admin, workspaceId, session }) => {
            const dashboardName = `E2E live widget ${sourceType}`;
            await deleteAllDashboardsForOwner({
              admin,
              workspaceId,
              ownerEmail: e2eWorkerDb.primaryUser.email,
            });
            try {
              const dataset = await session.importDataset(page);
              await LiveDatasetDashboardFlow.saveQueryToNewDashboard({
                page,
                dataset,
                dashboardName,
                sql: _makeDashboardSql(dataset.datasetId),
                firstColumnName: "region",
                expectedCellText: "Highlands",
              });
              await LiveDatasetDashboardFlow.openDashboardEditor({
                page,
                dashboardName,
              });

              await expect(async () => {
                const editorFrame = page
                  .locator("iframe")
                  .first()
                  .contentFrame();
                await expect(
                  editorFrame.getByRole("gridcell", {
                    name: "Highlands",
                    exact: true,
                  }),
                ).toBeVisible({ timeout: MEDIUM_WAIT });
              }).toPass({ timeout: LONG_WAIT });
            } finally {
              await deleteAllDashboardsForOwner({
                admin,
                workspaceId,
                ownerEmail: e2eWorkerDb.primaryUser.email,
              });
            }
          },
        );
      });

      test("publishes a whole-dataset slice that its published dashboard keeps showing", async ({
        page,
        e2eWorkerDb,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async (context) => {
            await deleteAllDashboardsForOwner({
              admin: context.admin,
              workspaceId: context.workspaceId,
              ownerEmail: e2eWorkerDb.primaryUser.email,
            });
            const dataset = await context.session.importDataset(page);
            await _expectPublishedDashboardKeepsRows({
              context,
              dataset,
              sliceLabel: "Whole dataset",
            });
          },
        );
      });

      test("publishes a queried slice that its published dashboard keeps showing", async ({
        page,
        e2eWorkerDb,
      }) => {
        await _withLiveConnector(
          { page, e2eWorkerDb, connector },
          async (context) => {
            await deleteAllDashboardsForOwner({
              admin: context.admin,
              workspaceId: context.workspaceId,
              ownerEmail: e2eWorkerDb.primaryUser.email,
            });
            const dataset = await context.session.importDataset(page);
            await _expectPublishedDashboardKeepsRows({
              context,
              dataset,
              sliceLabel: "Only what's queried (recommended)",
            });
          },
        );
      });
    });
  },
);
