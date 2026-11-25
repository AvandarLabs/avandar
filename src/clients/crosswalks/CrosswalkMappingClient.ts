import { CrosswalkMappingParsers } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads how each layout fills each column of a crosswalk's combined
 * dataset. Writes go through `CrosswalkClient.saveContents`.
 */
export const CrosswalkMappingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CrosswalkMapping",
    tableName: "crosswalks__mappings",
    dbTablePrimaryKey: "id",
    parsers: CrosswalkMappingParsers,
  }),
);
