import { SupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { withQueryHooks } from "@/lib/clients/withQueryHooks";
import { EntityFieldConfigCRUDTypes } from "./EntityFieldConfig";
import { EntityFieldConfigParsers } from "./EntityFieldConfigParsers";

class EntityConfigClientImpl extends SupabaseCRUDClient<
  "entity_field_configs",
  EntityFieldConfigCRUDTypes
> {}

export const EntityFieldConfigClient = withQueryHooks(
  new EntityConfigClientImpl({
    modelName: "EntityFieldConfig",
    tableName: "entity_field_configs",
    dbTablePrimaryKey: "id",
    parserRegistry: EntityFieldConfigParsers,
  }),
);
