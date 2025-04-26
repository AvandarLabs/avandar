import { createSupabaseCRUDClient } from "@/lib/clients/createSupabaseCRUDClient";
import { EntityConfigParsers } from "./parsers";

export const EntityConfigClient = createSupabaseCRUDClient({
  modelName: "EntityConfig",
  tableName: "entity_configs",
  dbTablePrimaryKey: "id",
  parsers: EntityConfigParsers,
});
