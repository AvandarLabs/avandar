import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { UserId } from "@/models/User/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset";

/**
 * This model tracks a locally-loaded dataset as a Parquet data blob.
 * It is loaded into an in-browser DuckDB instance as needed.
 */
type LocalDatasetDBRead = {
  /** The dataset id from the backend */
  datasetId: DatasetId;

  /** The workspace id the dataset belongs to */
  workspaceId: WorkspaceId;

  /** The user that has loaded this dataset locally */
  userId: UserId;

  /** The raw data of the dataset as a Parquet data blob */
  parquetData: Blob;
};

export type LocalDatasetModel = DexieModelCRUDTypes<{
  modelName: "LocalDataset";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
  dbTypes: {
    DBRead: LocalDatasetDBRead;
    DBUpdate: Partial<LocalDatasetDBRead>;
  };
  modelTypes: {
    Read: LocalDatasetDBRead;
    Update: Partial<LocalDatasetDBRead>;
  };
}>;

export type LocalDataset<K extends keyof LocalDatasetModel = "Read"> =
  LocalDatasetModel[K];
