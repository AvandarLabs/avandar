import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { AvaDataType } from "@/models/datasets/AvaDataType";
import { Model } from "@/models/Model";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { ValueExtractorType } from "../ValueExtractor/types";
import type { EntityConfigId } from "../EntityConfig.types";
import type { UUID } from "@/lib/types/common";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

type EntityFieldConfigRead = Model<
  "EntityFieldConfig",
  {
    id: EntityFieldConfigId;
    entityConfigId: EntityConfigId;
    workspaceId: WorkspaceId;
    name: string;
    description: string | undefined;
    createdAt: string;
    updatedAt: string;
    dataType: AvaDataType;
    valueExtractorType: ValueExtractorType;
    isTitleField: boolean;
    isIdField: boolean;
    allowManualEdit: boolean;
    isArray: boolean;
  }
>;

type EntityFieldConfigInsert = SetOptional<
  EntityFieldConfigRead,
  "id" | "createdAt" | "updatedAt" | "description"
>;

type EntityFieldConfigUpdate = Partial<EntityFieldConfigRead>;

export type EntityFieldConfigModel = SupabaseModelCRUDTypes<
  {
    tableName: "entity_field_configs";
    modelName: "EntityFieldConfig";
    modelPrimaryKeyType: EntityFieldConfigId;
    modelTypes: {
      Read: EntityFieldConfigRead;
      Insert: EntityFieldConfigInsert;
      Update: EntityFieldConfigUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type EntityFieldConfig<K extends keyof EntityFieldConfigModel = "Read"> =
  Simplify<EntityFieldConfigModel[K]>;
