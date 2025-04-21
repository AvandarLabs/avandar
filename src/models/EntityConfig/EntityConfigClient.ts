import { createSupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { EntityConfigParsers } from "./EntityConfigParsers";

export const EntityConfigClient = createSupabaseCRUDClient({
  modelName: "EntityConfig",
  tableName: "entity_configs",
  dbTablePrimaryKey: "id",
  parsers: EntityConfigParsers,
});
