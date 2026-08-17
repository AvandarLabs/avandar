import type { UUID } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { SetOptional, Simplify } from "type-fest";

export type DatasetColumnMappingId = UUID<"DatasetColumnMapping">;

export type ValuePickerRuleType =
  Enums<"attribute_mappings__value_picker_rule_type">;

type DatasetColumnMappingRead = {
  /** Unique identifier for this mapping */
  id: DatasetColumnMappingId;

  /** ID of the associated workspace */
  workspaceId: Workspace.Id;

  /** Type of mapping */
  type: "dataset_column";

  /** ID of the concept attribute this mapping populates */
  conceptAttributeId: ConceptAttributeId;

  /** Rule to pick which value to use when multiple are found */
  valuePickerRuleType: ValuePickerRuleType;

  /** ID of the dataset this mapping reads from */
  datasetId: DatasetId;

  /** ID of the specific column in the dataset this mapping reads */
  datasetColumnId: DatasetColumnId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type DatasetColumnMappingInsert = SetOptional<
  DatasetColumnMappingRead,
  "id" | "createdAt" | "updatedAt"
>;

type DatasetColumnMappingUpdate = Partial<DatasetColumnMappingRead>;

/**
 * CRUD type definitions for the DatasetColumnMapping model.
 */
export type DatasetColumnMappingModel = SupabaseCrudModelSpec<
  {
    tableName: "attribute_mappings__dataset_column";
    modelName: "DatasetColumnMapping";
    modelPrimaryKeyType: DatasetColumnMappingId;
    modelTypes: {
      Read: DatasetColumnMappingRead;
      Insert: DatasetColumnMappingInsert;
      Update: DatasetColumnMappingUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type DatasetColumnMapping<
  K extends keyof DatasetColumnMappingModel = "Read",
> = Simplify<DatasetColumnMappingModel[K]>;
