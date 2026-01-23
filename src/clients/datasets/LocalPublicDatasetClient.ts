import { EmptyObject } from "type-fest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { LocalPublicDatasetParsers } from "@/models/datasets/LocalPublicDataset";
import { PublicDatasetParquetStorageClient } from "../storage/PublicDatasetParquetStorageClient";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";
import type { DatasetId } from "@/models/datasets/Dataset";
import type {
  LocalPublicDataset,
  LocalPublicDatasetModel,
} from "@/models/datasets/LocalPublicDataset";

type LocalPublicDatasetClientMutations = {
  /**
   * Downloads a public dataset parquet blob from the public bucket and
   * caches it in IndexedDB.
   */
  fetchPublicDatasetToIndexedDB: (params: {
    dashboardId: DashboardId;
    datasetId: DatasetId;
  }) => Promise<LocalPublicDataset>;
};

/**
 * Manages public datasets that are stored locally in a user's browser's
 * IndexedDB.
 */
export const LocalPublicDatasetClient = createDexieCRUDClient<
  LocalPublicDatasetModel,
  EmptyObject,
  LocalPublicDatasetClientMutations
>({
  db: AvaDexie.DB,
  modelName: "LocalPublicDataset",
  parsers: LocalPublicDatasetParsers,
  mutations: (config) => {
    const downloadsInProgressByPublicDatasetId: Map<
      string,
      Promise<LocalPublicDataset>
    > = new Map();

    return {
      /**
       * Downloads a public dataset parquet blob from the public bucket and
       * caches it in IndexedDB.
       *
       * This is safe to call multiple times; duplicate calls for the same
       * dataset will reuse the same in-flight promise.
       */
      fetchPublicDatasetToIndexedDB: async (params: {
        dashboardId: DashboardId;
        datasetId: DatasetId;
      }): Promise<LocalPublicDataset> => {
        const { dashboardId, datasetId } = params;
        const existingPromise =
          downloadsInProgressByPublicDatasetId.get(datasetId);
        if (existingPromise) {
          return await existingPromise;
        }

        const downloadPromise = (async () => {
          const logger = config.logger.appendName(
            "fetchPublicDatasetToIndexedDB",
          );
          logger.log("Fetching public dataset to IndexedDB", params);

          const existing = await LocalPublicDatasetClient.getById({
            id: datasetId,
          });
          if (existing) {
            return existing;
          }

          const parquetBlob =
            await PublicDatasetParquetStorageClient.downloadDataset({
              dashboardId,
              datasetId,
              throwIfNotFound: true,
            });

          const publicDataset = await LocalPublicDatasetClient.insert({
            data: {
              dashboardId,
              datasetId,
              parquetData: parquetBlob,
              downloadedAt: new Date().toISOString(),
            },
          });

          return publicDataset;
        })().finally(() => {
          downloadsInProgressByPublicDatasetId.delete(datasetId);
        });

        downloadsInProgressByPublicDatasetId.set(datasetId, downloadPromise);
        return await downloadPromise;
      },
    };
  },
});
