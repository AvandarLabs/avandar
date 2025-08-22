import { Merge } from "type-fest";
import { DexieModelCRUDTypes } from "@/lib/models/DexieModelCRUDTypes";
import { UserId, UserProfileId } from "../../User/types";
import { WorkspaceId } from "../../Workspace/types";
import { DatasetId, DatasetSourceType } from "../Dataset/types";

type DatasetRawDataDBRead = {
  /** Timestamp of when this raw data object was created. */
  createdAt: string;

  /** Unique identifier of the dataset this raw data belongs to. */
  datasetId: DatasetId;

  /**
   * Type of the dataset this raw data belongs to. This lets us know what table
   * to look at for the parser configurations (e.g. local_csvs have different
   * parsing options than google_sheets)
   */
  sourceType: DatasetSourceType;

  /** Timestamp of when this raw data object was last updated. */
  updatedAt: string;

  /** Unique identifier of the owner of the raw data object. */
  ownerId: UserId;

  /** Unique identifier of the owner profile of the raw data object. */
  ownerProfileId: UserProfileId;

  /** Unique identifier of the workspace the raw data object belongs to. */
  workspaceId: WorkspaceId;

  /** The raw data, stored as a binary Blob */
  data: Blob;
};

type DatasetRawDataRead = Merge<
  DatasetRawDataDBRead,
  {
    createdAt: Date;
    updatedAt: Date;
  }
>;

export type DatasetRawDataModel = DexieModelCRUDTypes<{
  modelName: "DatasetRawData";
  primaryKey: "datasetId";
  primaryKeyType: DatasetId;
  dbTypes: {
    DBRead: DatasetRawDataDBRead;
    DBUpdate: Partial<DatasetRawDataDBRead>;
  };
  modelTypes: {
    Read: DatasetRawDataRead;
    Update: Partial<DatasetRawDataRead>;
  };
}>;
