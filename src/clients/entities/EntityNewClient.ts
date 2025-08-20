import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { EntityParsers } from "@/models/entities/Entity/parsers";

export const EntityNewClient = createSupabaseCRUDClient({
  modelName: "Entity",
  tableName: "entities",
  dbTablePrimaryKey: "id",
  parsers: EntityParsers,
});
