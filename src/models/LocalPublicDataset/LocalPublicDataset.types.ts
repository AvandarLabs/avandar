import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * A cached copy of a dataset's public parquet blob.
 *
 * This does not include `userId` because public viewers are unauthenticated.
 */
type PublicDatasetDBRead = {
  /** Snapshot bucket that supplied the cached parquet data. */
  bucket?: SnapshotBucketName;

  /** The public dashboard that owns this published dataset copy. */
  dashboardId: Dashboard.Id;

  /** The dataset id from the backend */
  datasetId: Dataset.Id;

  /** The raw data of the dataset as a Parquet data blob */
  parquetData: Blob;

  /** Dashboard revision that committed this published snapshot. */
  snapshotRevision?: string;

  /** When this dataset was downloaded (ISO timestamp) */
  downloadedAt: string;
};

export type LocalPublicDatasetModel = DexieCrudModelSpec<{
  modelName: "LocalPublicDataset";
  /**
   * Compound over the two columns already on the row. The same dataset can be
   * published by more than one dashboard, with a different slice each time,
   * so `datasetId` alone does not identify a cached blob.
   */
  primaryKey: ["dashboardId", "datasetId"];
  primaryKeyType: [Dashboard.Id, Dataset.Id];
  dbTypes: {
    DBRead: PublicDatasetDBRead;
    DBUpdate: Partial<PublicDatasetDBRead>;
  };
  modelTypes: {
    Read: PublicDatasetDBRead;
    Update: Partial<PublicDatasetDBRead>;
  };
}>;

export type LocalPublicDataset<
  K extends keyof LocalPublicDatasetModel = "Read",
> = LocalPublicDatasetModel[K];
