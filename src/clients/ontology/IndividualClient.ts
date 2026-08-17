import { IndividualParsers } from "$/models/ontology/Individual/IndividualParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const IndividualClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Individual",
    tableName: "individuals",
    dbTablePrimaryKey: "id",
    parsers: IndividualParsers,
  }),
);
