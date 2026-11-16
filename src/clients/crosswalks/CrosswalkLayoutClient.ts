import { CrosswalkLayoutParsers } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads a crosswalk's layouts. Writes go through
 * `CrosswalkClient.saveContents`.
 */
export const CrosswalkLayoutClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CrosswalkLayout",
    tableName: "crosswalks__layouts",
    dbTablePrimaryKey: "id",
    parsers: CrosswalkLayoutParsers,
  }),
);
