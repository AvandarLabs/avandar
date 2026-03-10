import { createSupabaseCRUDClient } from "@avandar/clients";
import { EntityConfigParsers } from "$/models/EntityConfig/EntityConfigParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const EntityConfigClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "EntityConfig",
    tableName: "entity_configs",
    dbTablePrimaryKey: "id",
    parsers: EntityConfigParsers,
  }),
);
