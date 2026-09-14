import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

type ModelType = "CsvFileDataset";

export type CsvFileDatasetId = UUID<ModelType>;

export type CsvFileDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** Unique identifier of the dataset. */
    datasetId: DatasetId;

    /** Unique identifier of the local CSV dataset in our system. */
    id: CsvFileDatasetId;

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
  }
>;

/**
 * CRUD type definitions for the LocalCsvDataset model.
 */
export type CsvFileDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__csv_file";
    modelName: "CsvFileDataset";
    modelPrimaryKeyType: CsvFileDatasetId;
    modelTypes: {
      Read: CsvFileDatasetRead;
      Insert: SetOptional<CsvFileDatasetRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<CsvFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
