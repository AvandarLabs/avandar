import { createDexieCRUDClient } from "@/clients/dexie/createDexieCRUDClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { LocalDatasetParsers } from "@/models/LocalDataset/LocalDatasetParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import { DuckDBClient } from "@/clients/DuckDBClient/index";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import type { DucKDBLoadCSVOptions } from "@/clients/DuckDBClient/index";
import type { DuckDBLoadCSVResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import type { LocalDataset } from "@/models/LocalDataset/LocalDataset.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DistributedOmit } from "type-fest";

/**
 * A client for managing datasets in local storage and in local memory.
 *
 * This client provides a unified interface to manage datasets locally,
 * regardless of the dataset's source type (e.g. CSV vs Google Sheets).
 *
 * LocalDatasetClient manages fetching datasets from the cloud, storing them
 * in local storage (if they were already fetched as parquet blobs), loading
 * them into memory, and exporting the loaded data from DuckDB as parquet blobs
 * in order to store them in local storage.
 *
 * ===Definitions===
 *
 * "Local storage" refers to the user's browser's IndexedDB, i.e. on disk. This
 * is different from "cloud storage" (which is when a dataset is sync'd to
 * the cloud and stored in Supabase storage buckets).
 *
 * "Local memory" or "in memory" refers to a dataset being loaded into DuckDB,
 * which is transient and is lost when the browser or tab is closed.
 *
 */
export const LocalDatasetClient = createUsableServiceClient(
  createDexieCRUDClient({
    db: AvaDexie.DB,
    modelName: "LocalDataset",
    parsers: LocalDatasetParsers,
    mutations: (config) => {
      const downloadsInProgressByDatasetId: Map<
        DatasetId,
        Promise<LocalDataset | undefined>
      > = new Map();

      return {
        /**
         * Add a CSV to local storage.
         */
        storeLocalCSV: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          userId: UserId;
          csvParseOptions: DistributedOmit<DucKDBLoadCSVOptions, "tableName">;
        }): Promise<DuckDBLoadCSVResult> => {
          const logger = config.logger.appendName("insertCSV");
          logger.log("Storing CSV locally", params);
          const { datasetId, csvParseOptions, workspaceId, userId } = params;
          const loadResult = await DuckDBClient.loadCSV({
            tableName: datasetId,
            ...csvParseOptions,
          });

          const parquetData = await DuckDBClient.exportTableAsParquet(
            loadResult.tableName,
          );

          // now that the data is in DuckDB memory, lets add an entry to
          // IndexedDB to track it in persisted local storage.
          await LocalDatasetClient.insert({
            data: {
              datasetId: datasetId,
              parquetData: parquetData,
              workspaceId: workspaceId,
              userId: userId,
            },
          });
          return loadResult;
        },

        /**
         * Drops the local dataset from both local storage (IndexedDB) and
         * memory (DuckDB).
         */
        dropLocalDataset: async (params: {
          datasetId: DatasetId;
        }): Promise<void> => {
          const logger = config.logger.appendName("dropLocalDataset");
          logger.log("Dropping local dataset", params);
          const { datasetId } = params;
          await LocalDatasetClient.delete({ id: datasetId });
          await DuckDBClient.dropTableViewAndFile(datasetId);
        },

        /**
         * Fetch a parquet dataset from cloud object storage and store it
         * locally.
         * @param params The options for fetching the cloud dataset (in Parquet
         * format) from cloud object storage.
         * @param params.datasetId The ID of the dataset to fetch.
         * @param params.workspaceId The ID of the workspace the dataset belongs
         * to.
         * @param params.userId The ID of the user that is fetching the dataset.
         * @returns The local dataset.
         */
        fetchCloudDatasetToLocalStorage: async (params: {
          datasetId: DatasetId;
          workspaceId: Workspace.Id;
          userId: UserId;
        }): Promise<LocalDataset | undefined> => {
          const existingPromise = downloadsInProgressByDatasetId.get(
            params.datasetId,
          );
          if (existingPromise) {
            return await existingPromise;
          }

          const downloadPromise = (async () => {
            const { datasetId, workspaceId, userId } = params;
            const logger = config.logger.appendName(
              "fetchCloudDatasetToLocalStorage",
            );
            logger.log("Fetching cloud dataset to local storage", params);
            const parquetBlob =
              await DatasetParquetStorageClient.downloadDataset({
                datasetId,
                workspaceId,
              });

            if (!parquetBlob) {
              return undefined;
            }

            return await LocalDatasetClient.insert({
              data: {
                datasetId,
                workspaceId,
                userId,
                parquetData: parquetBlob,
              },
            });
          })().finally(() => {
            downloadsInProgressByDatasetId.delete(params.datasetId);
          });

          downloadsInProgressByDatasetId.set(params.datasetId, downloadPromise);
          return await downloadPromise;
        },
      };
    },
  }),
  {
    mutationFns: [
      "storeLocalCSV",
      "dropLocalDataset",
      "fetchCloudDatasetToLocalStorage",
    ],
  },
);
