import { SetOptional, Simplify } from "type-fest";
import type { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import type { UUID } from "@/lib/types/common";
import type { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";

export type ManualEntryExtractorConfigId = UUID<"ManualEntryExtractorConfig">;

/**
 * CRUD type definition for the manual entry extractor config
 */
type ManualEntryExtractorConfigRead = {
  /** Unique identifier for this extractor config */
  id: ManualEntryExtractorConfigId;

  /** ID of the associated entity field config */
  entityFieldConfigId: EntityFieldConfigId;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
};

export type ManualEntryExtractorConfigCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "value_extractor_config__manual_entry";
    modelName: "ManualEntryExtractorConfig";
    modelPrimaryKeyType: ManualEntryExtractorConfigId;
  },
  {
    Read: ManualEntryExtractorConfigRead;
    Insert: SetOptional<
      Required<ManualEntryExtractorConfigRead>,
      "id" | "createdAt" | "updatedAt"
    >;
    Update: Partial<ManualEntryExtractorConfigRead>;
  },
  {
    modelPrimaryKey: "id";
    dbTablePrimaryKey: "id";
  }
>;

/**
 * Helper type for a specific variant of the ManualEntryExtractorConfig model
 */
export type ManualEntryExtractorConfig<
  K extends keyof ManualEntryExtractorConfigCRUDTypes = "Read",
> = Simplify<ManualEntryExtractorConfigCRUDTypes[K]>;
