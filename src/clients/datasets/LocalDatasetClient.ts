import { createDexieCRUDClient } from "@/clients/dexie/createDexieCRUDClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { LocalDatasetParsers } from "@/models/LocalDataset/LocalDatasetParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import { DuckDBClient } from "../DuckDBClient";
import { DatasetParquetStorageClient } from "../storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import type { DucKDBLoadCSVOptions } from "../DuckDBClient";
import type { DuckDBLoadCSVResult } from "../DuckDBClient/DuckDBClient.types";
import type { LocalDataset } from "@/models/LocalDataset/LocalDataset.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DistributedOmit } from "type-fest";

/**
 * A client for managing datasets in local storage.
 * "Local storage" refers to the user's browser's IndexedDB, i.e. on disk. This
 * is different from "in memory" (which is when a dataset is loaded into DuckDB,
 * which is transient) or "cloud storage" (which is when a dataset is sync'd to
 * the * cloud and stored in Supabase storage buckets).
 *
 * LocalDatasetClient manages fetching datasets from the cloud and exporting
 * tables from DuckDB in order to store the data as parquet blobs in local
 * storage.
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
