import { DataDictionaryEntryCodingParsers } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads which code lists each entry of a dictionary recognizes. Writes go
 * through `DataDictionaryClient.saveContents`.
 */
export const DataDictionaryEntryCodingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionaryEntryCoding",
    tableName: "data_dictionaries__entry_codings",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryEntryCodingParsers,
  }),
);
