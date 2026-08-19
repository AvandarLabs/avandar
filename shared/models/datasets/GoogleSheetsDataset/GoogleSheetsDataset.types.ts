import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

type ModelType = "GoogleSheetsDataset";
export type GoogleSheetsDatasetId = UUID<ModelType>;

export type GoogleSheetsDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** Unique identifier of the dataset. */
    datasetId: DatasetId;

    /** Google Sheet id in Google's system. */
    googleDocumentId: string;

    /** Google account ID associated to this Google sheet. */
    googleAccountId: string;

    /** Unique identifier of the Google Sheets dataset in our system. */
    id: GoogleSheetsDatasetId;

    /** Number of rows to skip before the tabular data starts. */
    rowsToSkip: number;

    /**
     * Name of the spreadsheet tab that backs this dataset.
     *
     * `null` means the workbook's first tab, which is what every row imported
     * before this column existed already read. New imports always write a
     * concrete name, so `null` is a legacy value with a shrinking blast radius
     * rather than a permanent ambiguity.
     */
    sheetName: string | null;

    /** Timestamp of when the Google Sheets metadata was last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace the dataset belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the GoogleSheetsDataset model.
 */
export type GoogleSheetsDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__google_sheets";
    modelName: "GoogleSheetsDataset";
    modelPrimaryKeyType: GoogleSheetsDatasetId;
    modelTypes: {
      Read: GoogleSheetsDatasetRead;
      Insert: SetOptional<
        GoogleSheetsDatasetRead,
        "createdAt" | "id" | "rowsToSkip" | "sheetName" | "updatedAt"
      >;
      Update: Partial<GoogleSheetsDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
