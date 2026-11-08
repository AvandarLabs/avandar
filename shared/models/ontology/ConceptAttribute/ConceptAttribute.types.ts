import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { AttributeMappingType } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type ConceptAttributeId = UUID<"ConceptAttribute">;

/**
 * The period a per-period field keeps one value for. Mirrors the
 * `concept_attributes__bucket_grain` database enum.
 */
export type ConceptAttributeBucketGrain =
  Enums<"concept_attributes__bucket_grain">;

/**
 * One period of a per-period field's value, as a reader displays it.
 * `bucket` is the period's first day as `YYYY-MM-DD`. `value` is the field's
 * rule applied to that period's rows.
 */
export type ConceptAttributeBucketedListEntry = {
  bucket: string;
  value: unknown;
};

type ConceptAttributeRead = Model.Base<
  "ConceptAttribute",
  {
    id: ConceptAttributeId;
    conceptId: ConceptId;
    workspaceId: Workspace.Id;
    name: string;
    description: string | undefined;
    createdAt: string;
    updatedAt: string;
    dataType: AvaDataType.T;
    mappingType: AttributeMappingType;
    isLabel: boolean;
    isIdentifier: boolean;
    allowManualEdit: boolean;
    isArray: boolean;
    /**
     * Set only on a per-period field: its value is one entry per period of
     * the mapping's date column. Always `undefined` when `isArray` is false.
     */
    bucketGrain: ConceptAttributeBucketGrain | undefined;
  }
>;

type ConceptAttributeInsert = SetOptional<
  ConceptAttributeRead,
  "id" | "createdAt" | "updatedAt" | "description" | "bucketGrain"
>;

type ConceptAttributeUpdate = Partial<ConceptAttributeRead>;

export type ConceptAttributeModel = SupabaseCrudModelSpec<
  {
    tableName: "concept_attributes";
    modelName: "ConceptAttribute";
    modelPrimaryKeyType: ConceptAttributeId;
    modelTypes: {
      Read: ConceptAttributeRead;
      Insert: ConceptAttributeInsert;
      Update: ConceptAttributeUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/**
 * How many values a field holds for one record. `single` reduces the field's
 * rows to one value with its value rule; `list` keeps every non-NULL value
 * in source order. Authoring, the concept view, the query form, and the
 * record page each branch on it, for example to hide the value rule of a
 * list.
 */
export type ConceptAttributeValueShape = "single" | "list";

/**
 * The names a case type's view gives one field. `columnName` is the column
 * the view emits. `resultName` is the name the field's value carries in a
 * query result, which is the field's own name unless another field shares it.
 */
export type ConceptAttributeViewColumn = {
  columnName: string;
  resultName: string;
};
