import { SupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { EntityConfigCRUDTypes, EntityConfigParsers } from "./EntityConfig";

class EntityConfigAPIClient extends SupabaseCRUDClient<
  "entity_configs",
  EntityConfigCRUDTypes
> {}

export const entityConfigAPIClient = new EntityConfigAPIClient({
  tableName: "entity_configs",
  dbTablePrimaryKey: "id",
  parserRegistry: EntityConfigParsers,
});
