import { DistributedOmit } from "type-fest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { DatasetId } from "@/models/datasets/Dataset";
import {
  LocalDataset,
  LocalDatasetParsers,
} from "@/models/datasets/LocalDataset";
import { UserId } from "@/models/User/User.types";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DuckDBClient, DucKDBLoadCSVOptions } from "../DuckDBClient";
import { DuckDBLoadCSVResult } from "../DuckDBClient/DuckDBClient.types";
import { DatasetParquetStorageClient } from "../storage/DatasetParquetStorageClient";

export const LocalDatasetClient = createDexieCRUDClient({
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
        workspaceId: WorkspaceId;
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

        // now that the data is in DuckDB memory, lets add an entry to IndexedDB
        // to track it in persisted local storage.
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
       * Drops the local dataset from both local storage (IndexedDB) and memory
       * (DuckDB).
       */
      dropLocalDataset: async (params: {
        datasetId: DatasetId;
      }): Promise<void> => {
        const logger = config.logger.appendName("dropLocalDataset");
        logger.log("Dropping local dataset", params);
        const { datasetId } = params;
        await LocalDatasetClient.delete({ id: datasetId });
        await DuckDBClient.dropTableAndFile(datasetId);
      },

      /**
       * Fetch a parquet dataset from cloud object storage and store it locally.
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
        workspaceId: WorkspaceId;
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
            await DatasetParquetStorageClient.downloadParquetDataset({
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
});
