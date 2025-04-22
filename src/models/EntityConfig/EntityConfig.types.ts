import { SetRequired, Simplify } from "type-fest";
import { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { UserId } from "@/models/User";
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
};

/**
 * CRUD type definitions for the EntityConfig model.
 */
export type EntityConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"entity_configs">,
  {
    modelName: "EntityConfig";
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
    Read: EntityConfigRead;
    Insert: SetRequired<Partial<EntityConfigRead>, "name">;
    Update: Partial<EntityConfigRead>;
  }
>;

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  Simplify<EntityConfigCRUDTypes[K]>;
