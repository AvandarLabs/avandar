import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import type { DatasetId } from "../Dataset";
import type { DashboardId } from "@/models/Dashboard/Dashboard.types";

/**
 * A cached copy of a dataset's public parquet blob.
 *
 * This does not include `userId` because public viewers are unauthenticated.
 */
type PublicDatasetDBRead = {
  /** The public dashboard that owns this published dataset copy. */
  dashboardId: DashboardId;

  /** The dataset id from the backend */
  datasetId: DatasetId;

  /** The raw data of the dataset as a Parquet data blob */
  parquetData: Blob;

  /** When this dataset was downloaded (ISO timestamp) */
  downloadedAt: string;
};

export type LocalPublicDatasetModel = DexieModelCRUDTypes<{
  modelName: "LocalPublicDataset";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
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
