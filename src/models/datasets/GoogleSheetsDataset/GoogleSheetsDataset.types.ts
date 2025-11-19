import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DatasetId } from "../Dataset/Dataset.types";

export type GoogleSheetsDatasetId = UUID<"GoogleSheetsDataset">;

export type GoogleSheetsDatasetRead = {
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

  /** Timestamp of when the Google Sheets metadata was last updated. */
  updatedAt: string;

  /** Unique identifier of the workspace the dataset belongs to. */
  workspaceId: WorkspaceId;
};

/**
 * CRUD type definitions for the GoogleSheetsDataset model.
 */
export type GoogleSheetsDatasetModel = SupabaseModelCRUDTypes<
  {
    tableName: "datasets__google_sheets";
    modelName: "GoogleSheetsDataset";
    modelPrimaryKeyType: GoogleSheetsDatasetId;
    modelTypes: {
      Read: GoogleSheetsDatasetRead;
      Insert: SetOptional<
        GoogleSheetsDatasetRead,
        "createdAt" | "id" | "rowsToSkip" | "updatedAt"
      >;
      Update: Partial<GoogleSheetsDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type GoogleSheetsDataset<
  K extends keyof GoogleSheetsDatasetModel = "Read",
> = GoogleSheetsDatasetModel[K];
