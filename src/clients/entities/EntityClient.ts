import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { EntityParsers } from "$/models/entities/Entity/EntityParsers";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const EntityClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Entity",
    tableName: "entities",
    dbTablePrimaryKey: "id",
    parsers: EntityParsers,
  }),
);
