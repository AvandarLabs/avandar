import { createServerApiClient } from "@clients";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { makeBucketRecord, matchLiteral, prop, where } from "@utils";
import { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import { WorkspaceId } from "$/models/Workspace/Workspace.types";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { GoogleSheetsDatasetClient } from "@/clients/datasets/source-datasets/GoogleSheetsDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { ExcludeNullsIn, FiltersByColumn } from "@utils";
import type { OpenDataCatalogEntryId } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  DatasetId,
  DatasetWithColumns,
} from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CompositeTypes } from "$/types/database.types";
import type { SetOptional } from "type-fest";

type DatasetColumnInput = SetOptional<
  ExcludeNullsIn<CompositeTypes<"dataset_column_input">>,
  "description"
>;

function _escapeNullChar(str: string): string | null {
  return str === "\u0000" ? null : str;
}

// Platform-aware server API client; reads the Supabase client registered by
// AvaSupabase for the web-backed adapter.
const serverApi = createServerApiClient();

export const DatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Dataset",
    tableName: "datasets",
    dbTablePrimaryKey: "id",
    parsers: DatasetParsers,
    queries: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * For a given dataset, get its source-specific dataset, e.g.
         * if it is a CsvFileDataset, GoogleSheetsDataset, etc.
         */
        getSourceDataset: async (params: {
          datasetId: DatasetId;
          sourceType: DatasetSource.SourceType;
        }): Promise<DatasetSource.T | undefined> => {
          const logger = clientLogger.appendName("getSourceDataset");
          logger.log("Getting the source dataset", params);
          const { datasetId, sourceType } = params;
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
        },

        getWithColumns: async (params: {
          id: DatasetId | undefined;
        }): Promise<DatasetWithColumns | undefined> => {
          const logger = clientLogger.appendName("getWithColumns");
          logger.log("Getting dataset with columns", params);

          if (params.id === undefined) {
            logger.log("Skipping fetching dataset because id is undefined");
            return undefined;
          }

          const { data } = await dbClient
            .from("datasets")
            .select("*, columns:dataset_columns(*)")
            .eq("id", params.id)
            .single()
            .throwOnError();

          logger.log("Successfully got dataset with columns", data);
          const { columns, ...dataset } = data;
          const parsedColumns = columns.map((col) => {
            return DatasetColumnClient.parsers.fromDBReadToModelRead(col);
          });
          const parsedDataset = parsers.fromDBReadToModelRead(dataset);
          return {
            ...parsedDataset,
            columns: parsedColumns,
          };
        },

        getAllDatasetsWithColumns: async (params?: {
          where?: FiltersByColumn<Dataset.T<"DBRead">>;
        }): Promise<DatasetWithColumns[]> => {
          const logger = clientLogger.appendName("getAllDatasetsWithColumns");
          logger.log("Getting all datasets with columns using params", params);
          const datasets = await DatasetClient.getAll(params);
          const allDatasetColumns = await DatasetColumnClient.getAll(
            where("dataset_id", "in", datasets.map(prop("id"))),
          );
          const bucketedDatasetColumns = makeBucketRecord(allDatasetColumns, {
            key: "datasetId",
          });
          const datasetsWithColumns = datasets.map((dataset: Dataset.T) => {
            return {
              ...dataset,
              columns: bucketedDatasetColumns[dataset.id] ?? [],
            };
          });

          logger.log(
            "Successfully got all datasets with columns",
            datasetsWithColumns,
          );
          return datasetsWithColumns;
        },
      };
    },

    mutations: ({ clientLogger, parsers }) => {
      return {
        insertVirtualDataset: async (params: {
          datasetId: DatasetId;
          workspaceId: WorkspaceId;
          datasetName: string;
          datasetDescription: string;
          columns: DatasetColumnInput[];
          rawSQL: string;
        }): Promise<Dataset.T> => {
          const logger = clientLogger.appendName("insertVirtualDataset");
          logger.log("Creating virtual dataset", params);
          const dataset = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_datasets__add_virtual_dataset", {
            p_dataset_id: params.datasetId,
            p_workspace_id: params.workspaceId,
            p_dataset_name: params.datasetName,
            p_dataset_description: params.datasetDescription,
            p_columns: params.columns.map((col) => {
              return { ...col, description: col.description ?? null };
            }),
            p_raw_sql: params.rawSQL,
          });
          logger.log("Successfully added virtual dataset", dataset);
          return parsers.fromDBReadToModelRead(dataset);
        },

        /**
         * Inserts a new local CSV dataset into the database.
         *
         * @param params - The parameters for the dataset to be inserted.
         * @returns The inserted dataset.
         */
        insertCsvFileDataset: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          datasetName: string;
          datasetDescription: string;
          columns: DatasetColumnInput[];
          isInCloudStorage: boolean;
          sizeInBytes: number;
          parseOptions: {
            rowsToSkip: number;
            quoteChar: string;
            escapeChar: string;
            delimiter: string;
            newlineDelimiter: string;
            commentChar: string;
            hasHeader: boolean;
            dateFormat: string | null;
            timestampFormat: string | null;
          };
        }): Promise<Dataset.T> => {
          const logger = clientLogger.appendName("insertCsvFileDataset");
          logger.log("Creating dataset", params);

          const {
            columns,
            isInCloudStorage,
            sizeInBytes,
            workspaceId,
            datasetName,
            datasetDescription,
            parseOptions,
          } = params;
          const dataset = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_datasets__add_csv_file_dataset", {
            p_dataset_id: params.datasetId,
            p_workspace_id: workspaceId,
            p_dataset_name: datasetName,
            p_dataset_description: datasetDescription,
            p_columns: columns.map((col) => {
              return { ...col, description: col.description ?? null };
            }),
            p_is_in_cloud_storage: isInCloudStorage,
            p_size_in_bytes: sizeInBytes,
            p_rows_to_skip: parseOptions.rowsToSkip,
            p_quote_char: {
              value: _escapeNullChar(parseOptions.quoteChar),
            },
            p_escape_char: {
              value: _escapeNullChar(parseOptions.escapeChar),
            },
            p_delimiter: parseOptions.delimiter,
            p_newline_delimiter: parseOptions.newlineDelimiter,
            p_comment_char: {
              value: _escapeNullChar(parseOptions.commentChar),
            },
            p_has_header: parseOptions.hasHeader,
            p_date_format: {
              date_format: parseOptions.dateFormat,
              timestamp_format: parseOptions.timestampFormat,
            },
          });

          logger.log("Successfully added dataset", dataset);
          return parsers.fromDBReadToModelRead(dataset);
        },

        /**
         * Inserts a new Excel (.xlsx) file dataset into the database.
         *
         * @param params - The parameters for the dataset to be inserted.
         * @returns The inserted dataset.
         */
        insertXlsxFileDataset: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          datasetName: string;
          datasetDescription: string;
          columns: DatasetColumnInput[];
          isInCloudStorage: boolean;
          sizeInBytes: number;
          rowsToSkip: number;
          sheetName?: string;
          hasHeader: boolean;
          dateFormat: string | null;
          timestampFormat: string | null;
        }): Promise<Dataset.T> => {
          const logger = clientLogger.appendName("insertXlsxFileDataset");
          logger.log("Creating xlsx file dataset", params);

          const {
            columns,
            isInCloudStorage,
            sizeInBytes,
            workspaceId,
            datasetName,
            datasetDescription,
            rowsToSkip,
            hasHeader,
            dateFormat,
            timestampFormat,
          } = params;
          const dataset = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_datasets__add_xlsx_file_dataset", {
            p_dataset_id: params.datasetId,
            p_workspace_id: workspaceId,
            p_dataset_name: datasetName,
            p_dataset_description: datasetDescription,
            p_columns: columns.map((col) => {
              return { ...col, description: col.description ?? null };
            }),
            p_is_in_cloud_storage: isInCloudStorage,
            p_size_in_bytes: sizeInBytes,
            p_rows_to_skip: rowsToSkip,
            p_sheet_name: {
              value: params.sheetName ?? null,
            },
            p_has_header: hasHeader,
            p_date_format: {
              date_format: dateFormat,
              timestamp_format: timestampFormat,
            },
          });

          logger.log("Successfully added xlsx file dataset", dataset);
          return parsers.fromDBReadToModelRead(dataset);
        },

        /**
         * Inserts a new Google Sheets dataset into the database.
         *
         * @param params - The parameters for the dataset to be inserted.
         * @returns The inserted dataset.
         */
        insertGoogleSheetsDataset: async (params: {
          workspaceId: WorkspaceId;
          datasetId: DatasetId;
          datasetName: string;
          datasetDescription: string;
          columns: DatasetColumnInput[];
          rowsToSkip: number;
          googleAccountId: string;
          googleDocumentId: string;
        }): Promise<Dataset.T> => {
          const logger = clientLogger.appendName("addNewDataset");
          logger.log("Creating dataset", params);

          const columns = params.columns.map((col) => {
            return {
              ...col,
              description: col.description ?? null,
            };
          });
          const dataset = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_datasets__add_google_sheets_dataset", {
            p_dataset_id: params.datasetId,
            p_workspace_id: params.workspaceId,
            p_dataset_name: params.datasetName,
            p_dataset_description: params.datasetDescription,
            p_columns: columns,
            p_google_account_id: params.googleAccountId,
            p_google_document_id: params.googleDocumentId,
            p_rows_to_skip: params.rowsToSkip,
          });

          logger.log("Successfully added dataset", dataset);
          return parsers.fromDBReadToModelRead(dataset);
        },

        /**
         * Inserts an open-data catalog dataset into the workspace.
         *
         * @param params - Catalog entry, columns, and dataset identity.
         * @returns The created dataset row.
         */
        insertOpenDataDataset: async (params: {
          datasetId: DatasetId;
          workspaceId: WorkspaceId;
          datasetName: string;
          datasetDescription: string;
          catalogEntryId: OpenDataCatalogEntryId;
          columns: DatasetColumnInput[];
        }): Promise<Dataset.T> => {
          const logger = clientLogger.appendName("insertOpenDataDataset");
          logger.log("Creating open data dataset", params);
          const dataset = await serverApi.rpc<
            Parameters<typeof parsers.fromDBReadToModelRead>[0]
          >("rpc_datasets__add_open_data_dataset", {
            p_dataset_id: params.datasetId,
            p_workspace_id: params.workspaceId,
            p_dataset_name: params.datasetName,
            p_dataset_description: params.datasetDescription,
            p_catalog_entry_id: params.catalogEntryId,
            p_columns: params.columns.map((col) => {
              return { ...col, description: col.description ?? null };
            }),
          });
          logger.log("Successfully added open data dataset", dataset);
          return parsers.fromDBReadToModelRead(dataset);
        },

        /**
         * This deletes a dataset fully, including the locally stored raw data.
         * This should be used any time a dataset needs to be deleted, instead
         * of using the `DatasetClient.delete()` function, which will only
         * delete the dataset (and related rows) from the backend.
         */
        fullDelete: async (params: { id: DatasetId }): Promise<void> => {
          const logger = clientLogger.appendName("fullDelete");
          logger.log("Deleting dataset", params);

          const { id } = params;

          const dataset = await DatasetClient.getById({ id });
          if (dataset) {
            // delete the Parquet file from cloud object storage if it exists
            await DatasetParquetStorageClient.deleteDataset({
              workspaceId: dataset.workspaceId,
              datasetId: id,
            });
          }

          await DatasetClient.delete({ id });

          // now delete things locally from IndexedDB
          const localDataset = await LocalDatasetClient.getById({
            id,
          });
          if (localDataset) {
            const { datasetId } = localDataset;
            await LocalDatasetClient.delete({ id: datasetId });
            // finally, delete the raw data locally from DuckDB
            await DuckDbClient.dropTableViewAndFile(datasetId);
          }
        },
      };
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
