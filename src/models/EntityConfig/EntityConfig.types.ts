import { Paths, SetOptional, SetRequiredDeep, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UserId } from "@/models/User/types";
import { Dataset } from "../datasets/Dataset";
import { WorkspaceId } from "../Workspace/types";
import { EntityFieldConfig } from "./EntityFieldConfig/EntityFieldConfig.types";
import { EntityFieldValueExtractor } from "./ValueExtractor/types";
import type { UUID } from "@/lib/types/common";
import { Model } from "../Model";

type ModelType = "EntityConfig";
export type EntityConfigId = UUID<ModelType>;

/**
 * Defines the configuration schema for an Entity.
 */
type EntityConfigRead = Model<ModelType, {
  /** Unique identifier for this entity config */
  id: EntityConfigId;

  /** Workspace ID this entity config belongs to */
  workspaceId: WorkspaceId;

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
}>;

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
export type EntityConfigModel = SupabaseModelCRUDTypes<
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
