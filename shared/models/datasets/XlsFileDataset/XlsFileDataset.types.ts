import type { UUID } from "@utils/types/common.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type XlsFileDatasetId = UUID<"XlsFileDatasetId">;

export type XlsFileDatasetRead = {
  /** Timestamp of when the dataset was created. */
  createdAt: string;

  /** Unique identifier of the dataset. */
  datasetId: DatasetId;

  /** Unique identifier of the XLS file dataset in our system. */
  id: XlsFileDatasetId;

  /** Timestamp of when the dataset was last updated. */
  updatedAt: string;

  /** Unique identifier of the workspace the dataset belongs to. */
  workspaceId: Workspace.Id;

  /** If true, the file is persisted in cloud storage. */
  isInCloudStorage: boolean;

  /** Size of the file in bytes. */
  sizeInBytes: number;

  /** Number of rows to skip at the start of the imported worksheet. */
  rowsToSkip: number;

  /** Worksheet that was read; undefined when the default sheet was used. */
  sheetName: string | undefined;

  /** Whether the worksheet has a header row. */
  hasHeader: boolean;

  /** Date format hint used when parsing cells. */
  dateFormat: string | undefined;

  /** Timestamp format hint used when parsing cells. */
  timestampFormat: string | undefined;
};

/**
 * CRUD type definitions for the XlsFileDataset model.
 */
export type XlsFileDatasetModel = SupabaseCRUDModelSpec<
  {
    tableName: "datasets__xls_file";
    modelName: "XlsFileDataset";
    modelPrimaryKeyType: XlsFileDatasetId;
    modelTypes: {
      Read: XlsFileDatasetRead;
      Insert: SetOptional<XlsFileDatasetRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<XlsFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
