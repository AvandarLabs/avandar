import { Paths, SetOptional, SetRequiredDeep, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UserId } from "@/models/User";
import { LocalDataset, LocalDatasetId } from "../LocalDataset/types";
import { EntityFieldConfig } from "./EntityFieldConfig/types";
import { EntityFieldValueExtractor } from "./ValueExtractor/types";
import type { UUID } from "@/lib/types/common";

export type EntityConfigId = UUID<"EntityConfig">;

/**
 * Defines the configuration schema for an Entity.
 */
type EntityConfigRead = {
  /** Unique identifier for this entity config */
  id: EntityConfigId;

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

  /** Dataset ID this entity config is created from */
  datasetId: LocalDatasetId | undefined;

  /** Whether users can manually create entities for this config */
  allowManualCreation: boolean;
};

type EntityConfigInsert = SetOptional<
  EntityConfigRead,
  "id" | "ownerId" | "description" | "createdAt" | "updatedAt" | "datasetId"
>;

type EntityConfigUpdate = Partial<EntityConfigInsert>;

type EntityConfigFull = EntityConfig & {
  dataset?: LocalDataset;
  fields?: ReadonlyArray<
    EntityFieldConfig & {
      valueExtractor?: EntityFieldValueExtractor;
    }
  >;
};

/**
 * CRUD type definitions for the EntityConfig model.
 */
export type EntityConfigCRUDTypes = SupabaseModelCRUDTypes<
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

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  EntityConfigCRUDTypes[K];

export type EntityConfigWith<Keys extends Paths<EntityConfig<"Full">>> =
  Simplify<SetRequiredDeep<EntityConfig<"Full">, Keys>>;
