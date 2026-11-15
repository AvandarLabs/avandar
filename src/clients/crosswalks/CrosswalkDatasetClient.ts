import { CrosswalkDatasetParsers } from "$/models/crosswalks/CrosswalkDataset/CrosswalkDataset";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads which datasets a crosswalk maps, and the layout each belongs to.
 * Only datasets the reader can open are returned. Writes go through
 * `CrosswalkClient.saveContents`.
 */
export const CrosswalkDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CrosswalkDataset",
    tableName: "crosswalks__datasets",
    dbTablePrimaryKey: "id",
    parsers: CrosswalkDatasetParsers,
  }),
);
