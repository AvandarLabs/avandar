import { expect } from "@playwright/test";
import { getAvaDataTypeFromPostgresDataType } from "$/connectors/postgres/getAvaDataTypeFromPostgresDataType/getAvaDataTypeFromPostgresDataType";
import { deleteAllDatasetsInWorkspaceForE2E } from "../supabaseAdminClient";
import { LONG_WAIT } from "../timeouts";
import { LiveSourceTable } from "./LiveSourceTable";
import { PostgresConnectionSeed } from "./PostgresConnectionSeed";
import { saveImportedLiveDataset } from "./saveImportedLiveDataset";
import type {
  ImportedLiveDataset,
  LiveConnectorE2e,
  LiveConnectorInstallOptions,
  LiveConnectorSession,
  LiveSourceRow,
} from "./LiveConnectorE2e.types";
import type { Page, Route } from "@playwright/test";

/** The table the stubbed connection lists. */
const SOURCE_RELATION = {
  relationId: "public.e2e_case_counts",
  label: "public.e2e_case_counts",
  kind: "table",
};

/**
 * The table's columns as its catalog declares them, typed with the same
 * mapping the edge function uses, so the stub reports what a real
 * connection would.
 */
const SOURCE_COLUMNS = [
  { columnName: "region", sourceType: "text" },
  { columnName: "cases", sourceType: "integer" },
  { columnName: "reported_on", sourceType: "date" },
].map((column) => {
  return {
    ...column,
    dataType: getAvaDataTypeFromPostgresDataType(column.sourceType),
  };
});

/** The source's current rows, shared by every stubbed route. */
type SourceState = {
  rows: readonly LiveSourceRow[];
  datasetReadUrls: string[];
};

/** The preview route's rows, keyed by column name as the catalog lists them. */
function _makePreviewRowsFromRows(
  rows: readonly LiveSourceRow[],
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    return {
      region: row.region,
      cases: row.cases,
      reported_on: row.reportedOn,
    };
  });
}

/** Answers a stubbed route with a JSON body. */
async function _fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Stubs the three `connectors` routes that would otherwise open a TCP
 * connection to an external Postgres server: the relation list, the
 * preview, and the dataset-keyed rows read. The edge function's own SSRF
 * guard refuses every local address, so no local database can stand in.
 */
async function _stubConnectorRoutes(
  options: Readonly<{ page: Page; source: SourceState }>,
): Promise<void> {
  const { page, source } = options;
  await page.route(
    "**/functions/v1/connectors/postgres/connections/*/relations",
    async (route) => {
      await _fulfillJson(route, { relations: [SOURCE_RELATION] });
    },
  );
  await page.route(
    "**/functions/v1/connectors/postgres/connections/*/relations/*/preview",
    async (route) => {
      await _fulfillJson(route, {
        columns: SOURCE_COLUMNS,
        previewRows: _makePreviewRowsFromRows(source.rows),
      });
    },
  );
  await page.route(
    "**/functions/v1/connectors/postgres/datasets/*/rows",
    async (route) => {
      source.datasetReadUrls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: LiveSourceTable.makeCsvFromRows(source.rows),
      });
    },
  );
}

/** Picks the stubbed table on the import page and saves it as a dataset. */
async function _importDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<ImportedLiveDataset> {
  const { page, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Connectors" }).click();

  // The most recently verified saved connection is picked automatically, and
  // its relations are listed without a click.
  const relationSelect = page.getByRole("combobox", {
    name: "Table or view to import",
  });
  await expect(relationSelect).toBeVisible({ timeout: LONG_WAIT });
  await relationSelect.click();
  await page
    .getByRole("option", { name: SOURCE_RELATION.label, exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: "reported_on" }),
  ).toBeVisible({ timeout: LONG_WAIT });

  return await saveImportedLiveDataset({ page, workspaceSlug });
}

async function _install(
  options: LiveConnectorInstallOptions,
): Promise<LiveConnectorSession> {
  const { admin, page, workspaceId } = options;
  const source: SourceState = {
    rows: LiveSourceTable.initialRows,
    datasetReadUrls: [],
  };
  const connection = await PostgresConnectionSeed.create({
    admin,
    workspaceId,
  });
  await _stubConnectorRoutes({ page, source });

  return {
    importDataset: (importPage) => {
      return _importDataset({
        page: importPage,
        workspaceSlug: options.e2eWorkerDb.workspaceSlug,
      });
    },
    setSourceRows: (rows) => {
      source.rows = rows;
    },
    getDatasetReadUrls: () => {
      return [...source.datasetReadUrls];
    },
    cleanUp: async () => {
      // Datasets first: a Postgres dataset's foreign key points at its
      // connection.
      await deleteAllDatasetsInWorkspaceForE2E({
        supabaseAdminClient: admin,
        workspaceId,
      });
      await PostgresConnectionSeed.remove({ admin, workspaceId, connection });
    },
  };
}

/** The Postgres connector, imported from a saved connection's table. */
export const postgresTableLiveConnectorE2e: LiveConnectorE2e = {
  refreshMenuItemName: "Refresh from the database",
  refreshedNotificationTitle: "Refreshed from the database",
  install: _install,
};
