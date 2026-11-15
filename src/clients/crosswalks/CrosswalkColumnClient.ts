import { CrosswalkColumnParsers } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads the columns of a crosswalk's combined dataset. Writes go through
 * `CrosswalkClient.saveContents`.
 */
export const CrosswalkColumnClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CrosswalkColumn",
    tableName: "crosswalks__columns",
    dbTablePrimaryKey: "id",
    parsers: CrosswalkColumnParsers,
  }),
);
