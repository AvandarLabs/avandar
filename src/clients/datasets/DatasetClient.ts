import { SetOptional } from "type-fest";
import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { where } from "@/lib/utils/filters/filterBuilders";
import { FiltersByColumn } from "@/lib/utils/filters/filtersByColumn";
import { makeBucketRecord } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { ExcludeNullsIn } from "@/lib/utils/objects/transformations";
import {
  Dataset,
  DatasetId,
  DatasetParsers,
  DatasetWithColumns,
} from "@/models/datasets/Dataset";
import { WorkspaceId } from "@/models/Workspace/types";
import { CompositeTypes } from "@/types/database.types";
import { DuckDBClient } from "../DuckDBClient";
import { DatasetColumnClient } from "./DatasetColumnClient";
import { LocalDatasetEntryClient } from "./LocalDatasetEntryClient";

type DatasetColumnInput = SetOptional<
  ExcludeNullsIn<CompositeTypes<"dataset_column_input">>,
  "description"
>;

function _escapeNullChar(str: string): string | null {
  return str === "\u0000" ? null : str;
}

export const DatasetClient = createSupabaseCRUDClient({
  modelName: "Dataset",
  tableName: "datasets",
  dbTablePrimaryKey: "id",
  parsers: DatasetParsers,
  queries: ({ clientLogger, dbClient, parsers }) => {
    return {
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
        where?: FiltersByColumn<Dataset<"DBRead">>;
      }): Promise<DatasetWithColumns[]> => {
        const logger = clientLogger.appendName("getAllDatasetsWithColumns");
        logger.log("Getting all datasets with columns using params", params);
        const datasets = await DatasetClient.getAll(params);
        const allDatasetColumns = await DatasetColumnClient.getAll(
          where("dataset_id", "in", datasets.map(getProp("id"))),
        );
        const bucketedDatasetColumns = makeBucketRecord(allDatasetColumns, {
          key: "datasetId",
        });
        const datasetsWithColumns = datasets.map((dataset: Dataset) => {
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

  mutations: ({ clientLogger, dbClient, parsers }) => {
    return {
      /**
       * Inserts a new local CSV dataset into the database.
       *
       * @param params - The parameters for the dataset to be inserted.
       * @returns The inserted dataset.
       */
      insertCSVFileDataset: async (params: {
        workspaceId: WorkspaceId;
        datasetName: string;
        datasetDescription: string;
        columns: DatasetColumnInput[];
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
      }): Promise<Dataset> => {
        const logger = clientLogger.appendName("addNewDataset");
        logger.log("Creating dataset", params);

        const {
          columns,
          sizeInBytes,
          workspaceId,
          datasetName,
          datasetDescription,
          parseOptions,
        } = params;
        const { data: dataset } = await dbClient
          .rpc("rpc_datasets__add_csv_file_dataset", {
            p_workspace_id: workspaceId,
            p_dataset_name: datasetName,
            p_dataset_description: datasetDescription,
            p_columns: columns.map((col) => {
              return { ...col, description: col.description ?? null };
            }),
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
          })
          .throwOnError();

        logger.log("Successfully added dataset", dataset);
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
        datasetName: string;
        datasetDescription: string;
        columns: DatasetColumnInput[];
        rowsToSkip: number;
        googleAccountId: string;
        googleDocumentId: string;
      }): Promise<Dataset> => {
        const logger = clientLogger.appendName("addNewDataset");
        logger.log("Creating dataset", params);

        const columns = params.columns.map((col) => {
          return {
            ...col,
            description: col.description ?? null,
          };
        });
        const { data: dataset } = await dbClient
          .rpc("rpc_datasets__add_google_sheets_dataset", {
            p_workspace_id: params.workspaceId,
            p_dataset_name: params.datasetName,
            p_dataset_description: params.datasetDescription,
            p_columns: columns,
            p_google_account_id: params.googleAccountId,
            p_google_document_id: params.googleDocumentId,
            p_rows_to_skip: params.rowsToSkip,
          })
          .throwOnError();

        logger.log("Successfully added dataset", dataset);
        return parsers.fromDBReadToModelRead(dataset);
      },

      /**
       * This deletes a dataset fully, including the locally stored raw data.
       * This should be used any time a dataset needs to be deleted, instead of
       * using the `DatasetClient.delete()` function, which will only delete the
       * dataset (and related rows) from the backend.
       */
      fullDelete: async (params: { id: DatasetId }): Promise<void> => {
        const logger = clientLogger.appendName("fullDelete");
        logger.log("Deleting dataset", params);

        const { id } = params;
        await DatasetClient.delete({ id });

        // now delete things locally from IndexedDB
        const localDatasetEntry = await LocalDatasetEntryClient.getById({
          id,
        });
        if (localDatasetEntry) {
          const { datasetId, localTableName } = localDatasetEntry;
          await LocalDatasetEntryClient.delete({ id: datasetId });

          // finally, delete the raw data locally from DuckDB
          await DuckDBClient.dropDataset(localTableName);
        }
      },
    };
  },
});
