import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { WorkspaceId } from "@/models/Workspace/types";
import { DatasetId } from "../Dataset/types";
import { AvaDataType } from "../AvaDataType/AvaDataType.types";
import { DuckDBDataType } from "@/clients/DuckDBClient/DuckDBDataType";

export type DatasetColumnId = UUID<"DatasetColumn">;

export type DatasetColumnRead = {
  /** Timestamp of when the dataset column was created. */
  createdAt: string;

  /**
   *  Original data type from the source data (if specified). Otherwise, this
   * will default to the DuckDB data type when we parse the dataset.
   * This value should never be changed, it is an inherent property of the
   * column. It is intentionally not an enum, because some data sources may come
   * with metadata about a column's type, which might be any string.
   */
  originalDataType: string;

  /**
   * The detected data type of the column, as inferred by DuckDB when parsing
   * the dataset for the first time. This is an enum of valid DuckDB data types.
   * This should never change after a dataset is parsed. We use this if we ever
   * need to re-parse a dataset, so we can check that the new dataset's types
   * are consistent with the original detected data types. This cannot be
   * manually changed by the user.
   */
  detectedDataType: DuckDBDataType;

  /**
   * Queryable data type of the column. This may differ from the
   * `detected_data_type`, because sometimes a column may need to be
   * cast to a different data type (e.g. numbers to timestamps) to allow
   * different operations. This value can also be changed manually by the user.
   */
  dataType: AvaDataType;

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
 * This is a subset of a DatasetColumn type with only the name, data type,
 * and column index.
 */
export type DetectedDatasetColumn = Pick<
  DatasetColumn,
  "name" | "originalDataType" | "detectedDataType" | "dataType" | "columnIdx"
>;

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
