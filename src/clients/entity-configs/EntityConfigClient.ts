import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { EntityConfigParsers } from "$/models/EntityConfig/EntityConfigParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const EntityConfigClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "EntityConfig",
    tableName: "entity_configs",
    dbTablePrimaryKey: "id",
    parsers: EntityConfigParsers,
  }),
);
