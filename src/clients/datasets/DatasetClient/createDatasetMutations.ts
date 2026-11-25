import {
  getOriginalFileExtensionFromSourceType,
  requiresOriginalFileRetention,
} from "$/models/datasets/DatasetSource/DatasetSource";
import { createServerApiClient } from "$/ServerApiClient";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DatasetOriginalFileStorageClient } from "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { UserClient } from "@/clients/UserClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CompositeTypes } from "$/types/database.types";
import type {
  DatasetColumnInput,
  DatasetDBRead,
  DatasetMutationConfig,
  DatasetMutationRecord,
} from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { ILogger } from "@avandar/logger";

// Platform-aware server API client; reads the Supabase client registered by
// AvaSupabase for the web-backed adapter.
const serverApi = createServerApiClient();

function _escapeNullChar(value: string): string | null {
  return value === "\u0000" ? null : value;
}

function _getDatabaseColumns(
  columns: readonly DatasetColumnInput[],
): Array<CompositeTypes<"dataset_column_input">> {
  return columns.map((column) => {
    return {
      ...column,
      description: column.description ?? null,
    };
  });
}

function _makeInsertVirtualDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertVirtualDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertVirtualDataset");
    logger.log("Creating virtual dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_virtual_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_raw_sql: params.rawSql,
      },
    );
    logger.log("Successfully added virtual dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertCsvFileDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertCsvFileDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertCsvFileDataset");
    logger.log("Creating dataset", params);
    const parseOptions = params.parseOptions;
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_csv_file_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_is_in_cloud_storage: params.isInCloudStorage,
        p_size_in_bytes: params.sizeInBytes,
        p_rows_to_skip: parseOptions.rowsToSkip,
        p_quote_char: { value: _escapeNullChar(parseOptions.quoteChar) },
        p_escape_char: { value: _escapeNullChar(parseOptions.escapeChar) },
        p_delimiter: parseOptions.delimiter,
        p_newline_delimiter: parseOptions.newlineDelimiter,
        p_comment_char: { value: _escapeNullChar(parseOptions.commentChar) },
        p_has_header: parseOptions.hasHeader,
        p_date_format: {
          date_format: parseOptions.dateFormat ?? null,
          timestamp_format: parseOptions.timestampFormat ?? null,
        },
      },
    );
    logger.log("Successfully added dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertXlsxFileDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertXlsxFileDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertXlsxFileDataset");
    logger.log("Creating xlsx file dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_xlsx_file_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_is_in_cloud_storage: params.isInCloudStorage,
        p_size_in_bytes: params.sizeInBytes,
        p_rows_to_skip: params.rowsToSkip,
        p_sheet_name: { value: params.sheetName ?? null },
        p_has_header: params.hasHeader,
        p_date_format: {
          date_format: params.dateFormat ?? null,
          timestamp_format: params.timestampFormat ?? null,
        },
      },
    );
    logger.log("Successfully added xlsx file dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertPdfFileDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertPdfFileDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertPdfFileDataset");
    logger.log("Creating pdf file dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_pdf_file_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_is_in_cloud_storage: params.isInCloudStorage,
        p_size_in_bytes: params.sizeInBytes,
        p_has_original_file: params.hasOriginalFile,
        p_regions: params.regions,
        p_output_mode: params.outputMode ?? "natural",
        p_llm_model: params.llmModel ?? null,
        p_page_range_start: params.pageRangeStart ?? null,
        p_page_range_end: params.pageRangeEnd ?? null,
        p_fingerprint: params.fingerprint,
      },
    );
    logger.log("Successfully added pdf file dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertGoogleSheetsDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertGoogleSheetsDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("addNewDataset");
    logger.log("Creating dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_google_sheets_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_google_account_id: params.googleAccountId,
        p_google_document_id: params.googleDocumentId,
        p_rows_to_skip: params.rowsToSkip,
        p_sheet_name: { value: params.sheetName ?? null },
      },
    );
    logger.log("Successfully added dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertPostgresTableDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertPostgresTableDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertPostgresTableDataset");
    logger.log("Creating postgres table dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_postgres_table_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_columns: _getDatabaseColumns(params.columns),
        p_connection_id: params.connectionId,
        p_schema_name: params.schemaName,
        p_table_name: params.tableName,
        p_relation_kind: params.relationKind,
      },
    );
    logger.log("Successfully added postgres table dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeInsertOpenDataDataset(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["insertOpenDataDataset"] {
  return async (params) => {
    const logger = options.logger.appendName("insertOpenDataDataset");
    logger.log("Creating open data dataset", params);
    const dataset = await serverApi.rpc<DatasetDBRead>(
      "rpc_datasets__add_open_data_dataset",
      {
        p_dataset_id: params.datasetId,
        p_workspace_id: params.workspaceId,
        p_dataset_name: params.datasetName,
        p_dataset_description: params.datasetDescription,
        p_catalog_listing_id: params.catalogListingId,
        p_columns: _getDatabaseColumns(params.columns),
      },
    );
    logger.log("Successfully added open data dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

/**
 * Throws unless the current user may delete the dataset. This is the same
 * rule as the `datasets` DELETE policy, so a delete that passes it cannot be
 * silently refused by row level security.
 *
 * The check goes through `UserClient.canAccessResource`, which uses the
 * platform-aware server API and never the webview's own Supabase client. On
 * desktop that client holds no session (only the main process carries the
 * access token), so its RPC would run as `anon`, which may not execute the
 * check.
 */
async function _assertCanDeleteDataset(
  options: Readonly<{ datasetId: Dataset.Id }>,
): Promise<void> {
  const { datasetId } = options;
  const canDelete = await UserClient.canAccessResource({
    resourceType: "dataset",
    resourceId: datasetId,
    minRole: "admin",
  });
  if (!canDelete) {
    throw new DatasetDeleteError({ datasetId, reason: "not_allowed" });
  }
}

/**
 * Throws if the dataset row can still be read. The CRUD client's delete does
 * not report how many rows it removed, so a delete that row level security
 * refuses looks like a success until the row is read back. On desktop the
 * CRUD client reads and deletes the local SQLite mirror, which has no row
 * level security, so there this read-back confirms only the local delete.
 */
async function _assertDatasetRowGone(
  options: Readonly<{
    client: DatasetMutationConfig["client"];
    datasetId: Dataset.Id;
  }>,
): Promise<void> {
  const { client, datasetId } = options;
  const remaining = await client.getById({ id: datasetId });
  if (remaining) {
    throw new DatasetDeleteError({ datasetId, reason: "still_present" });
  }
}

/**
 * Removes the dataset's parquet and, for a source that keeps one, its retained
 * original from Storage.
 */
async function _deleteDatasetFiles(
  options: Readonly<{ dataset: Dataset.T; logger: ILogger }>,
): Promise<void> {
  const { dataset, logger } = options;
  await DatasetParquetStorageClient.deleteDataset({
    workspaceId: dataset.workspaceId,
    datasetId: dataset.id,
  });
  if (requiresOriginalFileRetention(dataset.sourceType)) {
    // The metadata row deletion that follows is the point of no return for the
    // user (the dataset disappears from their workspace either way), so
    // a failure to remove the retained-original blob must not strand
    // them with a dataset they can no longer delete. Unlike the parquet
    // deletion above, which throws and aborts the delete, we log and
    // swallow: worst case is an orphaned blob to clean up later, not a
    // dataset stuck in limbo.
    await DatasetOriginalFileStorageClient.deleteOriginalFile({
      workspaceId: dataset.workspaceId,
      datasetId: dataset.id,
      fileExtension: getOriginalFileExtensionFromSourceType(dataset.sourceType),
    }).catch((error: unknown) => {
      logger.error(
        "Failed to delete the dataset's retained original file; leaving the object storage blob in place",
        { datasetId: dataset.id, error },
      );
    });
  }
}

function _makeFullDelete(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["fullDelete"] {
  return async (params) => {
    const logger = options.logger.appendName("fullDelete");
    logger.log("Deleting dataset", params);
    // A row the user cannot read comes back undefined and skips Storage, so
    // a user who may delete but not read it leaves the parquet behind. That
    // is the long-standing behavior and loses no data.
    const dataset = await options.client.getById(params);
    if (dataset) {
      // Check access before touching Storage: the files go first, so a row
      // that row level security would refuse to delete must be caught here.
      await _assertCanDeleteDataset({ datasetId: params.id });
      await _deleteDatasetFiles({ dataset, logger });
    }
    await options.client.delete(params);
    if (dataset) {
      // If this read-back throws (for example a network blip after the row
      // was deleted), the local cleanup below is skipped and the stale local
      // copy is left for a later cleanup.
      await _assertDatasetRowGone({
        client: options.client,
        datasetId: params.id,
      });
    }
    const localDataset = await LocalDatasetClient.getById(params);
    if (!localDataset) {
      return;
    }
    await LocalDatasetClient.delete({ id: localDataset.datasetId });
    await DuckDbClient.dropTableViewAndFile({
      tableOrViewName: localDataset.datasetId,
    });
  };
}

/** Builds the dataset mutations layered on top of the CRUD client. */
export function createDatasetMutations(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord {
  return {
    insertVirtualDataset: _makeInsertVirtualDataset(options),
    insertCsvFileDataset: _makeInsertCsvFileDataset(options),
    insertXlsxFileDataset: _makeInsertXlsxFileDataset(options),
    insertPdfFileDataset: _makeInsertPdfFileDataset(options),
    insertGoogleSheetsDataset: _makeInsertGoogleSheetsDataset(options),
    insertOpenDataDataset: _makeInsertOpenDataDataset(options),
    insertPostgresTableDataset: _makeInsertPostgresTableDataset(options),
    fullDelete: _makeFullDelete(options),
  };
}
