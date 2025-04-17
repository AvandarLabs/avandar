import { SupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { EntityConfigCRUDTypes, EntityConfigParsers } from "./EntityConfig";

class EntityConfigClientImpl extends SupabaseCRUDClient<
  "entity_configs",
  EntityConfigCRUDTypes
> {}

export const EntityConfigClient = new EntityConfigClientImpl({
  tableName: "entity_configs",
  dbTablePrimaryKey: "id",
  parserRegistry: EntityConfigParsers,
});
