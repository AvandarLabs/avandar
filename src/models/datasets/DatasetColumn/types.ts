import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { Registry } from "@/lib/types/utilityTypes";
import { objectKeys } from "@/lib/utils/objects/misc";
import { WorkspaceId } from "@/models/Workspace/types";
import { Enums } from "@/types/database.types";
import { DatasetId } from "../Dataset/types";

export type DatasetColumnId = UUID<"DatasetColumn">;

export type DatasetColumnDataType = Enums<"datasets__column_data_type">;

export const DatasetColumnDataTypes = objectKeys({
  text: true,
  number: true,
  date: true,
} satisfies Registry<DatasetColumnDataType>);

export type DatasetColumnRead = {
  /** Timestamp of when the dataset column was created. */
  createdAt: string;

  /** Data type of the column. */
  dataType: DatasetColumnDataType;

  /** Unique identifier of the dataset the column belongs to. */
  datasetId: DatasetId;

  /** Description of the column. */
  description: string | undefined;

  /** Unique identifier of the dataset column */
  id: DatasetColumnId;

  /** Name of the column. */
  name: string;

  /** Timestamp of when the dataset column metadata last updated. */
  updatedAt: string;

  /** Unique identifier of the workspace the dataset column belongs to. */
  workspaceId: WorkspaceId;

  /** Index of the column in the dataset. */
  columnIdx: number;
};

/**
 * CRUD type definitions for the DatasetColumn model.
 */
export type DatasetColumnModel = SupabaseModelCRUDTypes<
  {
    tableName: "dataset_columns";
    modelName: "DatasetColumn";
    modelPrimaryKeyType: DatasetColumnId;
    modelTypes: {
      Read: DatasetColumnRead;
      Insert: SetOptional<
        DatasetColumnRead,
        "createdAt" | "description" | "id" | "updatedAt"
      >;
      Update: Partial<DatasetColumnRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type DatasetColumn<K extends keyof DatasetColumnModel = "Read"> =
  DatasetColumnModel[K];
