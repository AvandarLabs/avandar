import { createSupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { EntityFieldConfigParsers } from "./EntityFieldConfigParsers";

export const EntityFieldConfigClient = createSupabaseCRUDClient({
  modelName: "EntityFieldConfig",
  tableName: "entity_field_configs",
  dbTablePrimaryKey: "id",
  parsers: EntityFieldConfigParsers,
});
