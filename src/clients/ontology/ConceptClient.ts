import { ConceptParsers } from "$/models/ontology/Concept/ConceptParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const ConceptClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Concept",
    tableName: "concepts",
    dbTablePrimaryKey: "id",
    parsers: ConceptParsers,
  }),
);
