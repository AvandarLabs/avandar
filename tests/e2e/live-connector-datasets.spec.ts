import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { switchToWorkspaceUser } from "./helpers/auth";
import { runSqlOverDataset } from "./helpers/dataExplorerFlow";
import { LiveConnectorE2eRegistry } from "./helpers/liveConnectors/LiveConnectorE2eRegistry";
import { LiveDatasetDashboardFlow } from "./helpers/liveConnectors/LiveDatasetDashboardFlow";
import { LiveDatasetPageFlow } from "./helpers/liveConnectors/LiveDatasetPageFlow";
import { LiveSourceTable } from "./helpers/liveConnectors/LiveSourceTable";
import { withLiveConnector } from "./helpers/liveConnectors/withLiveConnector";
import { LONG_WAIT } from "./helpers/timeouts";
import type { E2EWorkerDb } from "./fixtures/e2e.fixture";
import type { PublishedSliceMode } from "./helpers/liveConnectors/LiveDatasetDashboardFlow";
import type { LiveConnectorTestContext } from "./helpers/liveConnectors/withLiveConnector";
import type { Page } from "@playwright/test";

/**
 * Every live connector, held to the same end-to-end checks. A live source's
 * rows can change without anyone re-importing it, so past its import a live
 * connector must type its columns from its source, re-read its rows on
 * request, let any member who can see the dataset read it, and keep its
 * dashboards working once published. Each check below runs once per live
 * source type in `LiveConnectorE2eRegistry`, so a new connector is covered by
 * adding its entry.
 *
 * Each connector's stubs sit at the browser's network boundary: Google's
 * endpoints for a sheet's import, and our own edge function's routes for
 * everything else. Those routes read the source on the server with the
 * importer's credential, where `page.route` cannot reach, so who may read
 * through them is covered by their route tests instead. Here, the UI, the
 * client, DuckDB and the dashboards all run for real.
 */

/** Each slice a dashboard over a live dataset is published with. */
const PUBLISH_CASES: ReadonlyArray<{
  sliceMode: PublishedSliceMode;
  sliceDescription: string;
}> = [
  { sliceMode: "all_columns", sliceDescription: "the whole dataset" },
  { sliceMode: "queried", sliceDescription: "only its queried columns" },
];

/** Signs out the importer and signs in as the workspace's other member. */
async function _switchToOtherMember(
  options: Readonly<{ page: Page; e2eWorkerDb: E2EWorkerDb }>,
): Promise<void> {
  await switchToWorkspaceUser(options.page, {
    email: options.e2eWorkerDb.secondaryUser.email,
    password: options.e2eWorkerDb.secondaryUser.password,
    workspaceSlug: options.e2eWorkerDb.workspaceSlug,
  });
}

/**
 * Runs `body` with the importer owning no dashboards in the workspace, so a
 * save to a dashboard opens in create mode, and deletes every dashboard they
 * own afterwards, even when `body` fails.
 */
async function _withNoOwnerDashboards(
  options: Readonly<{
    context: Readonly<LiveConnectorTestContext>;
    body: () => Promise<void>;
  }>,
): Promise<void> {
  const { supabaseAdminClient, workspaceId, e2eWorkerDb } = options.context;
  const ownerDashboards = {
    supabaseAdminClient,
    workspaceId,
    ownerEmail: e2eWorkerDb.primaryUser.email,
  };
  await LiveDatasetDashboardFlow.deleteOwnerDashboards(ownerDashboards);
  try {
    await options.body();
  } finally {
    await LiveDatasetDashboardFlow.deleteOwnerDashboards(ownerDashboards);
  }
}

/**
 * Publishes a dashboard over the connector's dataset to the workspace with
 * `sliceMode`, edits the source, and asserts the workspace's other member
 * opening the dashboard's link sees the rows as they were published.
 */
async function _expectMemberReadsPublishedRows(
  options: Readonly<{
    context: Readonly<LiveConnectorTestContext>;
    sliceMode: PublishedSliceMode;
  }>,
): Promise<void> {
  const { page, e2eWorkerDb, session } = options.context;
  const dataset = await session.importDataset(page);
  const dashboardName = `E2E live publish ${dataset.datasetName}`;
  await LiveDatasetDashboardFlow.saveDatasetToNewDashboard({
    page,
    dataset,
    dashboardName,
  });
  const dashboardId = await LiveDatasetDashboardFlow.openDashboardEditor({
    page,
    dashboardName,
  });
  await LiveDatasetDashboardFlow.publishToWorkspace({
    page,
    dataset,
    sliceMode: options.sliceMode,
  });

  // The member has no cached copy of the dataset, so a viewer that read the
  // live source would show the edited row.
  session.setSourceRows(LiveSourceTable.rowsAfterEdit);
  await _switchToOtherMember({ page, e2eWorkerDb });
  await LiveDatasetDashboardFlow.expectLinkShowsPublishedRows({
    page,
    session,
    workspaceSlug: e2eWorkerDb.workspaceSlug,
    dashboardId,
  });
}

LiveConnectorE2eRegistry.getLiveConnectors().forEach(
  ({ sourceType, connector }) => {
    test.describe(`${sourceType} live dataset`, () => {
      test("types a whole-number and a date column as numbers and dates", async ({
        page,
        e2eWorkerDb,
      }) => {
        await withLiveConnector({
          page,
          e2eWorkerDb,
          connector,
          body: async ({ session }) => {
            const dataset = await session.importDataset(page);

            // Only a number summary averages, and only a date summary
            // measures the days a column covers.
            await page.getByRole("tab", { name: "Data Summary" }).click();
            await LiveDatasetPageFlow.expectColumnSummary({
              page,
              columnName: "cases",
              typeLabel: "Whole number",
              expectedFigure: "281.67",
            });
            await LiveDatasetPageFlow.expectColumnSummary({
              page,
              columnName: "reported_on",
              typeLabel: "Date",
              expectedFigure: "85 days",
            });

            // What DuckDB holds, which the summary alone cannot show: a date
            // summary casts its column to a date itself.
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
        });
      });

      test("shows a changed source row after a refresh", async ({
        page,
        e2eWorkerDb,
      }) => {
        await withLiveConnector({
          page,
          e2eWorkerDb,
          connector,
          body: async ({ session }) => {
            await session.importDataset(page);
            await expect(
              LiveDatasetPageFlow.getWholeNumberCell({ page, value: 450 }),
            ).toBeVisible({ timeout: LONG_WAIT });

            // The summary's queries never go stale on their own, so its
            // average only moves if the refresh re-runs them.
            await page.getByRole("tab", { name: "Data Summary" }).click();
            const casesSummary = {
              page,
              columnName: "cases",
              typeLabel: "Whole number",
            };
            await LiveDatasetPageFlow.expectColumnSummary({
              ...casesSummary,
              expectedFigure: "281.67",
            });

            session.setSourceRows(LiveSourceTable.rowsAfterEdit);
            await LiveDatasetPageFlow.refreshFromSource({ page, connector });
            await LiveDatasetPageFlow.expectColumnSummary({
              ...casesSummary,
              expectedFigure: "464.67",
            });
            await page.getByRole("tab", { name: "Metadata" }).click();
            await expect(
              LiveDatasetPageFlow.getWholeNumberCell({ page, value: 999 }),
            ).toBeVisible({ timeout: LONG_WAIT });
            await expect(
              LiveDatasetPageFlow.getWholeNumberCell({ page, value: 450 }),
            ).toHaveCount(0);
          },
        });
      });

      // Requesting `e2eViewerMembership` is what makes the secondary user a
      // Global Viewer member of the workspace for this test.
      test("lets a member who did not import it read its rows", async ({
        page,
        e2eWorkerDb,
        e2eViewerMembership: _viewerMembership,
      }) => {
        await withLiveConnector({
          page,
          e2eWorkerDb,
          connector,
          body: async ({ session }) => {
            const dataset = await session.importDataset(page);
            await _switchToOtherMember({ page, e2eWorkerDb });

            // Signing in again discarded the importer's page, so every read
            // from here on is the member's.
            const readCountBeforeMemberOpens =
              session.getDatasetReadUrls().length;
            await page.getByRole("link", { name: "Data Sources" }).click();
            await page
              .getByRole("link", { name: dataset.datasetName, exact: true })
              .click();
            await expect(
              page.getByRole("gridcell", { name: "Highlands", exact: true }),
            ).toBeVisible({ timeout: LONG_WAIT });

            // Through the dataset's own route, the one that reads with the
            // importer's credential, not a credential of the member's own.
            const memberReadUrls = session
              .getDatasetReadUrls()
              .slice(readCountBeforeMemberOpens);
            expect(memberReadUrls.length).toBeGreaterThan(0);
            memberReadUrls.forEach((url) => {
              expect(url).toContain(`/datasets/${dataset.datasetId}/`);
            });
          },
        });
      });

      test("renders its rows in a dashboard widget", async ({
        page,
        e2eWorkerDb,
      }) => {
        await withLiveConnector({
          page,
          e2eWorkerDb,
          connector,
          body: async (context) => {
            await _withNoOwnerDashboards({
              context,
              body: async () => {
                const dataset = await context.session.importDataset(page);
                const dashboardName = `E2E live widget ${sourceType}`;
                await LiveDatasetDashboardFlow.saveDatasetToNewDashboard({
                  page,
                  dataset,
                  dashboardName,
                });
                await LiveDatasetDashboardFlow.openDashboardEditor({
                  page,
                  dashboardName,
                });
                await LiveDatasetDashboardFlow.expectEditorWidgetShowsRows(
                  page,
                );
              },
            });
          },
        });
      });

      PUBLISH_CASES.forEach(({ sliceMode, sliceDescription }) => {
        test(`publishes ${sliceDescription} so a member reads the published rows after the source changes`, async ({
          page,
          e2eWorkerDb,
          e2eViewerMembership: _viewerMembership,
        }) => {
          await withLiveConnector({
            page,
            e2eWorkerDb,
            connector,
            body: async (context) => {
              await _withNoOwnerDashboards({
                context,
                body: () => {
                  return _expectMemberReadsPublishedRows({
                    context,
                    sliceMode,
                  });
                },
              });
            },
          });
        });
      });
    });
  },
);
