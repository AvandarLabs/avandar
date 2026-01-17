import { UUID } from "$/lib/types/common";
import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DatasetId } from "../Dataset/Dataset.types";

export type CSVFileDatasetId = UUID<"CSVFileDatasetId">;

export type CSVFileDatasetRead = {
  /** Timestamp of when the dataset was created. */
  createdAt: string;

  /** Unique identifier of the dataset. */
  datasetId: DatasetId;

  /** Unique identifier of the local CSV dataset in our system. */
  id: CSVFileDatasetId;

  /** Timestamp of when the dataset was last updated. */
  updatedAt: string;

  /** Unique identifier of the workspace the dataset belongs to. */
  workspaceId: WorkspaceId;

  /** If true, the CSV will no longer be persisted in cloud storage. */
  offlineOnly: boolean;

  /** Size of the dataset in bytes. */
  sizeInBytes: number;

  /** Number of rows to skip at the start of the file */
  rowsToSkip: number;

  /** Quote character used in the CSV file */
  quoteChar: string | undefined;

  /** Escape character used in the CSV file */
  escapeChar: string | undefined;

  /** Delimiter used in the CSV file. */
  delimiter: string;

  /** Newline delimiter used in the CSV file */
  newlineDelimiter: string;

  /** Comment character used in the CSV file */
  commentChar: string | undefined;

  /** Whether the CSV has a header */
  hasHeader: boolean;

  /** Date format of the CSV file */
  dateFormat: string | undefined;

  /** Timestamp format of the CSV file */
  timestampFormat: string | undefined;
};

/**
 * CRUD type definitions for the LocalCSVDataset model.
 */
export type CSVFileDatasetModel = SupabaseModelCRUDTypes<
  {
    tableName: "datasets__csv_file";
    modelName: "CSVFileDataset";
    modelPrimaryKeyType: DatasetId;
    modelTypes: {
      Read: CSVFileDatasetRead;
      Insert: SetOptional<CSVFileDatasetRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<CSVFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type CSVFileDataset<K extends keyof CSVFileDatasetModel = "Read"> =
  CSVFileDatasetModel[K];
