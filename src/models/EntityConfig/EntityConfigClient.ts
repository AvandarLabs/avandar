import { SupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { withQueryHooks } from "@/lib/clients/withQueryHooks";
import { EntityConfigCRUDTypes } from "./EntityConfig";
import { EntityConfigParsers } from "./EntityConfigParsers";

class EntityConfigClientImpl extends SupabaseCRUDClient<
  "entity_configs",
  EntityConfigCRUDTypes
> {}

export const EntityConfigClient = withQueryHooks(
  new EntityConfigClientImpl({
    modelName: "EntityConfig",
    tableName: "entity_configs",
    dbTablePrimaryKey: "id",
    parserRegistry: EntityConfigParsers,
  }),
);
