import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types.ts";
import type { ValueExtractorType } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

export type EntityFieldConfigId = UUID<"EntityFieldConfig">;

type EntityFieldConfigRead = Model.Base<
  "EntityFieldConfig",
  {
    id: EntityFieldConfigId;
    entityConfigId: EntityConfigId;
    workspaceId: Workspace.Id;
    name: string;
    description: string | undefined;
    createdAt: string;
    updatedAt: string;
    dataType: AvaDataType.T;
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

export type EntityFieldConfigModel = SupabaseCRUDModelSpec<
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
