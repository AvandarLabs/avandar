import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { EntityFieldValueParsers } from "@/models/entities/EntityFieldValue/parsers";

export const EntityFieldValueClient = createSupabaseCRUDClient({
  modelName: "EntityFieldValue",
  tableName: "entity_field_values",
  dbTablePrimaryKey: "id",
  parsers: EntityFieldValueParsers,
});
