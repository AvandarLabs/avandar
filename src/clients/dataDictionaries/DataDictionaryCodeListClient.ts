import { DataDictionaryCodeListParsers } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads a dictionary's code lists. Writes go through
 * `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryCodeListClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryCodeList",
    tableName: "data_dictionaries__code_lists",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryCodeListParsers,
  }),
);
