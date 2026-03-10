import { createSupabaseCRUDClient } from "@avandar/clients";
import { EntityParsers } from "$/models/entities/Entity/EntityParsers";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const EntityClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "Entity",
    tableName: "entities",
    dbTablePrimaryKey: "id",
    parsers: EntityParsers,
  }),
);
