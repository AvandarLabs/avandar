import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UUID } from "@/lib/types/common";
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { EntityId } from "../Entity/types";

export type EntityFieldValueId = UUID<"EntityFieldValue">;

type EntityFieldValueRead = {
  createdAt: string;
  datasetId: DatasetId | undefined;
  entityFieldConfigId: EntityFieldConfigId;
  entityId: EntityId;
  entityConfigId: EntityConfigId;
  id: EntityFieldValueId;
  updatedAt: string;
  value: string | undefined;
  valueSet: string[];
  workspaceId: WorkspaceId;
};

/**
 * CRUD type definitions for the Workspace model.
 */
export type EntityFieldValueModel = SupabaseModelCRUDTypes<
  {
    tableName: "entity_field_values";
    modelName: "EntityFieldValue";
    modelPrimaryKeyType: EntityFieldValueId;
    modelTypes: {
      Read: EntityFieldValueRead;
      Insert: SetOptional<
        EntityFieldValueRead,
        "createdAt" | "datasetId" | "id"
      >;
      Update: Partial<EntityFieldValueRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type EntityFieldValue<K extends keyof EntityFieldValueModel = "Read"> =
  EntityFieldValueModel[K];
