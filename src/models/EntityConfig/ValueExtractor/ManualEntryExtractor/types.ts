import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import type { UUID } from "$/lib/types/common";

export type ManualEntryExtractorId = UUID<"ManualEntryExtractor">;

/**
 * CRUD type definition for the manual entry extractor config
 */
type ManualEntryExtractorRead = {
  /** Unique identifier for this extractor config */
  id: ManualEntryExtractorId;

  /** ID of the associated workspace */
  workspaceId: WorkspaceId;

  /** Type of extractor */
  type: "manual_entry";

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

type ManualEntryExtractorInsert = SetOptional<
  ManualEntryExtractorRead,
  "id" | "createdAt" | "updatedAt"
>;

type ManualEntryExtractorUpdate = Partial<ManualEntryExtractorRead>;

export type ManualEntryExtractorModel = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractors__manual_entry";
    modelName: "ManualEntryExtractor";
    modelPrimaryKeyType: ManualEntryExtractorId;
    modelTypes: {
      Read: ManualEntryExtractorRead;
      Insert: ManualEntryExtractorInsert;
      Update: ManualEntryExtractorUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

/**
 * Helper type for a specific variant of the ManualEntryExtractor model
 */
export type ManualEntryExtractor<
  K extends keyof ManualEntryExtractorModel = "Read",
> = Simplify<ManualEntryExtractorModel[K]>;
