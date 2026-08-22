import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional, Simplify } from "type-fest";

export type ManualEntryMappingId = UUID<"ManualEntryMapping">;

/**
 * CRUD type definition for the manual entry attribute mapping
 */
type ManualEntryMappingRead = {
  /** Unique identifier for this mapping */
  id: ManualEntryMappingId;

  /** ID of the associated workspace */
  workspaceId: Workspace.Id;

  /** Type of mapping */
  type: "manual_entry";

  /** ID of the concept attribute this mapping populates */
  conceptAttributeId: ConceptAttributeId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type ManualEntryMappingInsert = SetOptional<
  ManualEntryMappingRead,
  "id" | "createdAt" | "updatedAt"
>;

type ManualEntryMappingUpdate = Partial<ManualEntryMappingRead>;

export type ManualEntryMappingModel = SupabaseCrudModelSpec<
  {
    tableName: "attribute_mappings__manual_entry";
    modelName: "ManualEntryMapping";
    modelPrimaryKeyType: ManualEntryMappingId;
    modelTypes: {
      Read: ManualEntryMappingRead;
      Insert: ManualEntryMappingInsert;
      Update: ManualEntryMappingUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/**
 * Helper type for a specific variant of the ManualEntryMapping model
 */
export type ManualEntryMapping<
  K extends keyof ManualEntryMappingModel = "Read",
> = Simplify<ManualEntryMappingModel[K]>;
