import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DuckDBDataType } from "$/models/datasets/DatasetColumn/DuckDBDataTypes.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type DatasetColumnId = UUID<"DatasetColumn">;

export type DatasetColumnRead = Model.Base<
  "DatasetColumn",
  {
    /** Timestamp of when the dataset column was created. */
    createdAt: string;

    /**
     *  Original data type from the source data (if specified). Otherwise, this
     * will default to the DuckDB data type when we parse the dataset.
     * This value should never be changed, it is an inherent property of the
     * column. It is intentionally not an enum, because some data sources may
     * come with metadata about a column's type, which might be any string.
     */
    originalDataType: string;

    /**
     * The detected data type of the column, as inferred by DuckDB when parsing
     * the dataset for the first time. This is an enum of valid DuckDB data
     * types. This should never change after a dataset is parsed. We use this if
     * we ever need to re-parse a dataset, so we can check that the new
     * dataset's types are consistent with the original detected data types.
     * This cannot be manually changed by the user.
     */
    detectedDataType: DuckDBDataType;

    /**
     * Queryable data type of the column. This may differ from the
     * `detected_data_type`, because sometimes a column may need to be
     * cast to a different data type (e.g. numbers to timestamps) to allow
     * different operations. This value can also be changed manually by the
     * user.
     */
    dataType: AvaDataType.T;

    /** Unique identifier of the dataset the column belongs to. */
    datasetId: DatasetId;

    /** Description of the column. */
    description: string | undefined;

    /** Unique identifier of the dataset column */
    id: DatasetColumnId;

    /**
     * Original name of the column from the source data. This is not
     * user-editable so we can always have a reference to the original name
     * from the source data.
     */
    originalName: string;

    /**
     * Name of the column. This is user-editable. It can differ from the
     * `originalName` field if the user renames the column.
     */
    name: string;

    /** Timestamp of when the dataset column metadata last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace the dataset column belongs to. */
    workspaceId: Workspace.Id;

    /** Index of the column in the dataset. */
    columnIdx: number;
  }
>;

/**
 * This is a subset of a DatasetColumn type with only the name, data type,
 * and column index.
 */
export type DetectedDatasetColumn = Pick<
  DatasetColumnRead,
  | "originalName"
  | "name"
  | "originalDataType"
  | "detectedDataType"
  | "dataType"
  | "columnIdx"
>;

/**
 * CRUD type definitions for the DatasetColumn model.
 */
export type DatasetColumnModel = SupabaseCRUDModelSpec<
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
