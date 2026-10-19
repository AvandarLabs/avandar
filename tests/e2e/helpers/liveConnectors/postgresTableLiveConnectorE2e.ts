import { snakeCaseKeysShallow } from "@avandar/utils";
import { expect } from "@playwright/test";
import { getAvaDataTypeFromPostgresDataType } from "$/connectors/postgres/getAvaDataTypeFromPostgresDataType/getAvaDataTypeFromPostgresDataType";
import { pickPostgresRelation } from "../pickPostgresRelation";
import { saveCloudOnlyDataset } from "../saveCloudOnlyDataset";
import { deleteAllDatasetsInWorkspaceForE2E } from "../supabaseAdminClient";
import { LONG_WAIT } from "../timeouts";
import { LiveSourceTable } from "./LiveSourceTable";
import { PostgresConnectionSeed } from "./PostgresConnectionSeed";
import type { SavedDataset } from "../saveCloudOnlyDataset";
import type {
  LiveConnectorE2e,
  LiveConnectorInstallOptions,
  LiveConnectorSession,
  LiveSourceRow,
} from "./LiveConnectorE2e.types";
import type { Page } from "@playwright/test";
import type {
  ConnectorPreviewColumn,
  ConnectorRelation,
} from "@sbfn/connectors/Connector";

/** The table the stubbed connection lists. */
const SOURCE_RELATION: ConnectorRelation = {
  relationId: "public.e2e_case_counts",
  label: "public.e2e_case_counts",
  kind: "table",
};

/**
 * The table's columns as its catalog declares them, typed with the same
 * mapping the edge function uses, so the stub reports what a real
 * connection would.
 */
const SOURCE_COLUMNS: ConnectorPreviewColumn[] = [
  { columnName: "region", sourceType: "text" },
  { columnName: "cases", sourceType: "integer" },
  { columnName: "reported_on", sourceType: "date" },
].map((column) => {
  return {
    ...column,
    dataType: getAvaDataTypeFromPostgresDataType(column.sourceType),
  };
});

/** The source's current rows, and every dataset read its rows route saw. */
type SourceState = {
  rows: readonly LiveSourceRow[];
  datasetReadUrls: string[];
};

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
      await route.fulfill({ json: { relations: [SOURCE_RELATION] } });
    },
  );
  await page.route(
    "**/functions/v1/connectors/postgres/connections/*/relations/*/preview",
    async (route) => {
      await route.fulfill({
        json: {
          columns: SOURCE_COLUMNS,
          // Keyed by column name, as the catalog lists them.
          previewRows: source.rows.map(snakeCaseKeysShallow),
        },
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
): Promise<SavedDataset> {
  const { page, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Connectors" }).click();
  await pickPostgresRelation({ page, relationLabel: SOURCE_RELATION.label });
  await expect(
    page.getByRole("columnheader", { name: "reported_on" }),
  ).toBeVisible({ timeout: LONG_WAIT });

  return await saveCloudOnlyDataset({ page, workspaceSlug });
}

async function _install(
  options: Readonly<LiveConnectorInstallOptions>,
): Promise<LiveConnectorSession> {
  const { supabaseAdminClient, page, workspaceId } = options;
  const source: SourceState = {
    rows: LiveSourceTable.initialRows,
    datasetReadUrls: [],
  };
  const connection = await PostgresConnectionSeed.create({
    supabaseAdminClient,
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
        supabaseAdminClient,
        workspaceId,
      });
      await PostgresConnectionSeed.remove({
        supabaseAdminClient,
        workspaceId,
        connection,
      });
    },
  };
}

/** The Postgres connector, imported from a saved connection's table. */
export const postgresTableLiveConnectorE2e: LiveConnectorE2e = {
  refreshMenuItemName: "Refresh from the database",
  refreshedNotificationTitle: "Refreshed from the database",
  install: _install,
};
