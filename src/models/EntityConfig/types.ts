import { SetOptional, Simplify } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { UserId } from "@/models/User";
import { LocalDatasetId } from "../LocalDataset/types";
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
  description: string | null;

  /** Timestamp when this entity config was created */
  createdAt: string;

  /** Timestamp when this entity config was last updated */
  updatedAt: string;

  /** Dataset ID this entity config is created from */
  datasetId: LocalDatasetId | null;

  /** Whether users can manually create entities for this config */
  allowManualCreation: boolean;
};

type EntityConfigInsert = SetOptional<
  Required<EntityConfigRead>,
  "id" | "ownerId" | "description" | "createdAt" | "updatedAt"
>;

type EntityConfigUpdate = Partial<EntityConfigRead>;

/**
 * CRUD type definitions for the EntityConfig model.
 */
export type EntityConfigCRUDTypes = SupabaseModelCRUDTypes<
  {
    tableName: "entity_configs";
    modelName: "EntityConfig";
    modelPrimaryKeyType: EntityConfigId;
  },
  {
    Read: EntityConfigRead;
    Insert: EntityConfigInsert;
    Update: EntityConfigUpdate;
  },
  {
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
  }
>;

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  Simplify<EntityConfigCRUDTypes[K]>;
