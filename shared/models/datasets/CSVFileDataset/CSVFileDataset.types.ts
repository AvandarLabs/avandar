import type { DatasetId } from "../Dataset/Dataset.types.ts";
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

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
  workspaceId: Workspace.Id;

  /** If true it means the CSV is persisted in cloud storage */
  isInCloudStorage: boolean;

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
export type CSVFileDatasetModel = SupabaseCRUDModelSpec<
  {
    tableName: "datasets__csv_file";
    modelName: "CSVFileDataset";
    modelPrimaryKeyType: CSVFileDatasetId;
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
