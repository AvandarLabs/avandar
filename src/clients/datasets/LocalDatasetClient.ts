import { DistributedOmit } from "type-fest";
import { AvaDexie } from "@/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { DatasetId } from "@/models/datasets/Dataset";
import { LocalDatasetParsers } from "@/models/datasets/LocalDataset";
import { UserId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { DuckDBClient, DucKDBLoadCSVOptions } from "../DuckDBClient";
import { DuckDBLoadCSVResult } from "../DuckDBClient/types";

export const LocalDatasetClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "LocalDataset",
  parsers: LocalDatasetParsers,
  mutations: (config) => {
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
    };
  },
});
