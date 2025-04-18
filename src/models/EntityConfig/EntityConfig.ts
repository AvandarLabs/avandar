import { CamelCasedPropertiesDeep, Merge, SetRequired } from "type-fest";
import { DefineModelCRUDTypes } from "@/lib/utils/models/ModelCRUDTypes";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { UserId } from "@/models/User";
import type { UUID } from "@/lib/types/common";

export type EntityConfigId = UUID<"EntityConfig">;

export type EntityConfigCRUDTypes = DefineModelCRUDTypes<
  SupabaseModelCRUDTypes<"entity_configs">,
  {
    modelName: "EntityConfig";
    dbTablePrimaryKey: "id";
    modelPrimaryKey: "id";
    Read: Merge<
      CamelCasedPropertiesDeep<EntityConfigCRUDTypes["DBRead"]>,
      {
        id: EntityConfigId;
        ownerId: UserId;
      }
    >;
    Insert: SetRequired<Partial<EntityConfigCRUDTypes["Read"]>, "name">;
    Update: Partial<EntityConfigCRUDTypes["Read"]>;
  }
>;

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  EntityConfigCRUDTypes[K];
