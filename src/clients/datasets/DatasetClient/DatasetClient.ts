import { makeBucketRecord, matchLiteral, prop, where } from "@avandar/utils";
import { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createServerApiClient } from "$/ServerApiClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { GoogleSheetsDatasetClient } from "@/clients/datasets/source-datasets/GoogleSheetsDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ILogger } from "@avandar/logger";
import type { ExcludeNullsIn, FiltersByColumn } from "@avandar/utils";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { CompositeTypes } from "$/types/database.types";
import type { SetOptional } from "type-fest";

type DatasetColumnInput = SetOptional<
  ExcludeNullsIn<CompositeTypes<"dataset_column_input">>,
  "description"
>;

type DatasetDBRead = Parameters<typeof DatasetParsers.fromDBReadToModelRead>[0];

function _escapeNullChar(value: string): string | null {
  return value === "\u0000" ? null : value;
}

// Platform-aware server API client; reads the Supabase client registered by
// AvaSupabase for the web-backed adapter.
const serverApi = createServerApiClient();

type BaseDatasetInsertParams = {
  datasetId: Dataset.Id;
  workspaceId: Workspace.Id;
  datasetName: string;
  datasetDescription: string;
  columns: readonly DatasetColumnInput[];
};

type CsvDatasetParseOptions = {
  rowsToSkip: number;
  quoteChar: string;
  escapeChar: string;
  delimiter: string;
  newlineDelimiter: string;
  commentChar: string;
  hasHeader: boolean;
  dateFormat?: string;
  timestampFormat?: string;
};

type CsvDatasetInsertParams = BaseDatasetInsertParams & {
  isInCloudStorage: boolean;
  sizeInBytes: number;
  parseOptions: CsvDatasetParseOptions;
};

type XlsxDatasetInsertParams = BaseDatasetInsertParams & {
  isInCloudStorage: boolean;
  sizeInBytes: number;
  rowsToSkip: number;
  sheetName?: string;
  hasHeader: boolean;
  dateFormat?: string;
  timestampFormat?: string;
};

type GoogleSheetsDatasetInsertParams = BaseDatasetInsertParams & {
  rowsToSkip: number;
  googleAccountId: string;
  googleDocumentId: string;
};

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

type DatasetMutationRecord = {
  insertVirtualDataset: (
    params: Readonly<BaseDatasetInsertParams & { rawSql: string }>,
  ) => Promise<Dataset.T>;
  insertCsvFileDataset: (
    params: Readonly<CsvDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertXlsxFileDataset: (
    params: Readonly<XlsxDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertGoogleSheetsDataset: (
    params: Readonly<GoogleSheetsDatasetInsertParams>,
  ) => Promise<Dataset.T>;
  insertOpenDataDataset: (
    params: Readonly<
      BaseDatasetInsertParams & { catalogEntryId: OpenDataCatalogEntry.Id }
    >,
  ) => Promise<Dataset.T>;
  fullDelete: (params: Readonly<{ id: Dataset.Id }>) => Promise<void>;
};

type DatasetMutationConfig = {
  logger: ILogger;
  parsers: typeof DatasetParsers;
};

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
      },
    );
    logger.log("Successfully added dataset", dataset);
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
        p_catalog_entry_id: params.catalogEntryId,
        p_columns: _getDatabaseColumns(params.columns),
      },
    );
    logger.log("Successfully added open data dataset", dataset);
    return options.parsers.fromDBReadToModelRead(dataset);
  };
}

function _makeFullDelete(
  options: Readonly<DatasetMutationConfig>,
): DatasetMutationRecord["fullDelete"] {
  return async (params) => {
    const logger = options.logger.appendName("fullDelete");
    logger.log("Deleting dataset", params);
    const dataset = await DatasetClient.getById(params);
    if (dataset) {
      await DatasetParquetStorageClient.deleteDataset({
        workspaceId: dataset.workspaceId,
        datasetId: params.id,
      });
    }
    await DatasetClient.delete(params);
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

function _createDatasetMutations(
  options: Readonly<{ logger: ILogger; parsers: typeof DatasetParsers }>,
): DatasetMutationRecord {
  return {
    insertVirtualDataset: _makeInsertVirtualDataset(options),
    insertCsvFileDataset: _makeInsertCsvFileDataset(options),
    insertXlsxFileDataset: _makeInsertXlsxFileDataset(options),
    insertGoogleSheetsDataset: _makeInsertGoogleSheetsDataset(options),
    insertOpenDataDataset: _makeInsertOpenDataDataset(options),
    fullDelete: _makeFullDelete(options),
  };
}

type DatasetQueryConfig = {
  clientLogger: ILogger;
  dbClient: AvaSupabaseDBClient;
  parsers: typeof DatasetParsers;
};

function _makeGetSourceDataset(config: Readonly<DatasetQueryConfig>): (
  params: Readonly<{
    datasetId: Dataset.Id;
    sourceType: DatasetSource.SourceType;
  }>,
) => Promise<DatasetSource.T | undefined> {
  return async (params) => {
    const { datasetId, sourceType } = params;
    config.clientLogger
      .appendName("getSourceDataset")
      .log("Getting the source dataset", params);
    return matchLiteral(sourceType, {
      virtual: () => {
        return VirtualDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      csv_file: () => {
        return CsvFileDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      google_sheets: () => {
        return GoogleSheetsDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      open_data: () => {
        return OpenDataDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      xlsx_file: () => {
        return XlsxFileDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
    });
  };
}

function _makeGetWithColumns(
  config: Readonly<DatasetQueryConfig>,
): (
  params: Readonly<{ id: Dataset.Id | undefined }>,
) => Promise<Dataset.WithColumns | undefined> {
  return async (params) => {
    const logger = config.clientLogger.appendName("getWithColumns");
    logger.log("Getting dataset with columns", params);
    if (params.id === undefined) {
      logger.log("Skipping fetching dataset because id is undefined");
      return undefined;
    }
    const { data } = await config.dbClient
      .from("datasets")
      .select("*, columns:dataset_columns(*)")
      .eq("id", params.id)
      .single()
      .throwOnError();
    const { columns, ...dataset } = data;
    return {
      ...config.parsers.fromDBReadToModelRead(dataset),
      columns: columns.map(DatasetColumnClient.parsers.fromDBReadToModelRead),
    };
  };
}

function _makeGetAllDatasetsWithColumns(
  config: Readonly<DatasetQueryConfig>,
): (
  params?: Readonly<{ where?: FiltersByColumn<Dataset.T<"DBRead">> }>,
) => Promise<Dataset.WithColumns[]> {
  return async (params) => {
    const logger = config.clientLogger.appendName("getAllDatasetsWithColumns");
    const datasets = await DatasetClient.getAll(params);
    const allDatasetColumns = await DatasetColumnClient.getAll(
      where("dataset_id", "in", datasets.map(prop("id"))),
    );
    const columnsByDataset = makeBucketRecord(allDatasetColumns, {
      key: "datasetId",
    });
    const datasetsWithColumns = datasets.map((dataset: Dataset.T) => {
      return {
        ...dataset,
        columns: columnsByDataset[dataset.id] ?? [],
      };
    });
    logger.log(
      "Successfully got all datasets with columns",
      datasetsWithColumns,
    );
    return datasetsWithColumns;
  };
}

function _createDatasetQueries(config: Readonly<DatasetQueryConfig>): {
  getSourceDataset: ReturnType<typeof _makeGetSourceDataset>;
  getWithColumns: ReturnType<typeof _makeGetWithColumns>;
  getAllDatasetsWithColumns: ReturnType<typeof _makeGetAllDatasetsWithColumns>;
} {
  return {
    getSourceDataset: _makeGetSourceDataset(config),
    getWithColumns: _makeGetWithColumns(config),
    getAllDatasetsWithColumns: _makeGetAllDatasetsWithColumns(config),
  };
}

/** Provides remote dataset queries and mutations with React Query adapters. */
export const DatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Dataset",
    tableName: "datasets",
    dbTablePrimaryKey: "id",
    parsers: DatasetParsers,
    queries: _createDatasetQueries,

    mutations: ({ clientLogger, parsers }) => {
      return _createDatasetMutations({ logger: clientLogger, parsers });
    },
  }),
  {
    queryFns: [
      "getSourceDataset",
      "getWithColumns",
      "getAllDatasetsWithColumns",
    ],
    mutationFns: [
      "insertCsvFileDataset",
      "insertXlsxFileDataset",
      "insertGoogleSheetsDataset",
      "insertOpenDataDataset",
      "insertVirtualDataset",
      "fullDelete",
    ],
  },
);
