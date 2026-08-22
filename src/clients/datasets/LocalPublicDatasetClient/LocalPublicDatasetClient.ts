import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { LocalPublicDataset } from "@/models/LocalPublicDataset/LocalPublicDataset";
import type { ILogger } from "@avandar/logger";
import type { EmptyObject } from "@avandar/utils";

import { createDexieCrudClient } from "@/clients/dexie/createDexieCrudClient/createDexieCrudClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { LocalPublicDatasetParsers } from "@/models/LocalPublicDataset/LocalPublicDatasetParsers";

type FetchPublicDatasetParams = {
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  datasetId: Dataset.Id;
  snapshotRevision: string;
};

async function _downloadPublicDataset(
  options: Readonly<{
    logger: ILogger;
    params: Readonly<FetchPublicDatasetParams>;
  }>,
): Promise<LocalPublicDataset.T> {
  const { params } = options;
  const { bucket, dashboardId, datasetId, snapshotRevision } = params;
  const logger = options.logger.appendName("fetchPublicDatasetToIndexedDB");
  logger.log("Fetching public dataset to IndexedDB", params);
  const existing = await LocalPublicDatasetClient.getById({
    id: [dashboardId, datasetId],
  });
  if (
    existing?.bucket === bucket &&
    existing.snapshotRevision === snapshotRevision
  ) {
    return existing;
  }
  const parquetBlob = await PublicDatasetParquetStorageClient.downloadDataset({
    bucket,
    dashboardId,
    datasetId,
    snapshotRevision,
    throwIfNotFound: true,
  });
  return LocalPublicDatasetClient.insert({
    upsert: true,
    data: {
      bucket,
      dashboardId,
      datasetId,
      parquetData: parquetBlob,
      snapshotRevision,
      downloadedAt: new Date().toISOString(),
    },
  });
}

function _createLocalPublicDatasetMutations(logger: ILogger): {
  fetchPublicDatasetToIndexedDB: (
    params: Readonly<FetchPublicDatasetParams>,
  ) => Promise<LocalPublicDataset.T>;
} {
  const downloadsInProgress = new Map<string, Promise<LocalPublicDataset.T>>();
  const fetchPublicDatasetToIndexedDB = async (
    params: Readonly<FetchPublicDatasetParams>,
  ): Promise<LocalPublicDataset.T> => {
    const { bucket, dashboardId, datasetId, snapshotRevision } = params;
    const inFlightKey = `${bucket}/${dashboardId}/${datasetId}/${snapshotRevision}`;
    const existingPromise = downloadsInProgress.get(inFlightKey);
    if (existingPromise) {
      return existingPromise;
    }
    const downloadPromise = _downloadPublicDataset({ logger, params }).finally(
      () => {
        downloadsInProgress.delete(inFlightKey);
      },
    );
    downloadsInProgress.set(inFlightKey, downloadPromise);
    return downloadPromise;
  };
  return {
    fetchPublicDatasetToIndexedDB,
  };
}

/**
 * Manages public datasets that are stored locally in a user's browser's
 * IndexedDB.
 */
export const LocalPublicDatasetClient = createDexieCrudClient<
  LocalPublicDataset.Model,
  EmptyObject,
  {
    fetchPublicDatasetToIndexedDB: (
      params: Readonly<FetchPublicDatasetParams>,
    ) => Promise<LocalPublicDataset.T>;
  }
>({
  db: AvaDexie.DB,
  modelName: "LocalPublicDataset",
  parsers: LocalPublicDatasetParsers,
  mutations: ({ logger }) => {
    return _createLocalPublicDatasetMutations(logger);
  },
});
