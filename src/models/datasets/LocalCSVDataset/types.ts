import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset/types";

export type LocalCSVDatasetId = UUID<"LocalCSVDataset">;

export type LocalCSVDatasetRead = {
  /** Timestamp of when the dataset was created. */
  createdAt: string;

  /** Unique identifier of the dataset. */
  datasetId: DatasetId;

  /** Delimiter used in the CSV file. */
  delimiter: string;

  /** Unique identifier of the local CSV dataset in our system. */
  id: LocalCSVDatasetId;

  /** Size of the dataset in bytes. */
  sizeInBytes: number;

  /** Timestamp of when the dataset was last updated. */
  updatedAt: string;

  /** Unique identifier of the workspace the dataset belongs to. */
  workspaceId: WorkspaceId;
};

/**
 * CRUD type definitions for the LocalCSVDataset model.
 */
export type LocalCSVDatasetModel = SupabaseModelCRUDTypes<
  {
    tableName: "datasets__local_csv";
    modelName: "LocalCSVDataset";
    modelPrimaryKeyType: DatasetId;
    modelTypes: {
      Read: LocalCSVDatasetRead;
      Insert: SetOptional<
        LocalCSVDatasetRead,
        "createdAt" | "id" | "updatedAt"
      >;
      Update: Partial<LocalCSVDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type LocalCSVDataset<K extends keyof LocalCSVDatasetModel = "Read"> =
  LocalCSVDatasetModel[K];
