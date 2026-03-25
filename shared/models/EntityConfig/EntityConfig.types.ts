import type { Dataset } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { EntityFieldValueExtractor } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types.ts";
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Paths, SetOptional, SetRequiredDeep, Simplify } from "type-fest";

type ModelType = "EntityConfig";
export type EntityConfigId = UUID<ModelType>;

/**
 * Defines the configuration schema for an Entity.
 */
type EntityConfigRead = Model.Base<
  ModelType,
  {
    /** Unique identifier for this entity config */
    id: EntityConfigId;

    /** Workspace ID this entity config belongs to */
    workspaceId: Workspace.Id;

    /** User ID of the owner of this entity config */
    ownerId: UserId;

    /** Display name of the entity */
    name: string;

    /** Optional description of what this entity represents */
    description: string | undefined;

    /** Timestamp when this entity config was created */
    createdAt: string;

    /** Timestamp when this entity config was last updated */
    updatedAt: string;

    /** Whether users can manually create entities for this config */
    allowManualCreation: boolean;
  }
>;

type EntityConfigInsert = SetOptional<
  EntityConfigRead,
  "id" | "ownerId" | "description" | "createdAt" | "updatedAt"
>;

type EntityConfigUpdate = Partial<EntityConfigInsert>;

type EntityConfigFull = EntityConfig & {
  datasets?: Dataset[];
  fields?: ReadonlyArray<
    EntityFieldConfig & {
      valueExtractor?: EntityFieldValueExtractor;
    }
  >;
};

/**
 * CRUD type definitions for the EntityConfig model.
 */
export type EntityConfigModel = SupabaseCRUDModelSpec<
  {
    tableName: "entity_configs";
    modelName: "EntityConfig";
    modelPrimaryKeyType: EntityConfigId;
    modelTypes: {
      Read: EntityConfigRead;
      Insert: EntityConfigInsert;
      Update: EntityConfigUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  },
  {
    Full: EntityConfigFull;
  }
>;

export type EntityConfig<K extends keyof EntityConfigModel = "Read"> =
  EntityConfigModel[K];

export type EntityConfigWith<Keys extends Paths<EntityConfig<"Full">>> =
  Simplify<SetRequiredDeep<EntityConfig<"Full">, Keys>>;

export type BuildableEntityConfig = EntityConfigWith<
  "datasets" | "fields" | `fields.${number}.valueExtractor`
>;

export type BuildableFieldConfig = BuildableEntityConfig["fields"][number];
