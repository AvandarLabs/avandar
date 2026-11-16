import { DataDictionaryEntryParsers } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads a dictionary's entries. Writes go through
 * `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryEntryClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryEntry",
    tableName: "data_dictionaries__entries",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryEntryParsers,
  }),
);
