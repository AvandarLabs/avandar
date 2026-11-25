import { DataDictionaryParsers } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { codePairsToDBJson } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

type SavePayload = DataDictionary.SavePayload;

function _codeListToRpcArg(codeList: SavePayload["codeLists"][number]) {
  return {
    id: codeList.id,
    name: codeList.name,
    is_ordered: codeList.isOrdered,
    pairs: codePairsToDBJson(codeList.pairs),
  };
}

function _entryToRpcArg(entry: SavePayload["entries"][number]) {
  return {
    id: entry.id,
    name: entry.name,
    column_names: entry.columnNames,
    kind: entry.kind,
    unit: entry.unit ?? null,
    valid_min: entry.validMin ?? null,
    valid_max: entry.validMax ?? null,
    description: entry.description ?? null,
    position: entry.position,
    codings: entry.codings.map((coding) => {
      return { code_list_id: coding.codeListId, is_primary: coding.isPrimary };
    }),
  };
}

/**
 * Reads, creates, renames, and deletes dictionaries, and saves their
 * contents. Entries and code lists are saved whole through `saveContents`,
 * never row by row, so the dictionary's version moves once per save.
 */
export const DataDictionaryClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DataDictionary",
    tableName: "data_dictionaries",
    dbTablePrimaryKey: "id",
    parsers: DataDictionaryParsers,
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces a dictionary's entries and code lists in one transaction
         * and returns its new version. A refusal rejects with the RPC's
         * `hint`; read it with `DataDictionary.toSaveErrorHint`.
         */
        saveContents: async (payload: SavePayload): Promise<number> => {
          const logger = clientLogger.appendName("saveContents");
          logger.log("Saving dictionary contents", {
            dictionaryId: payload.dictionaryId,
          });
          const { data } = await dbClient
            .rpc("rpc_data_dictionaries__save", {
              p_dictionary_id: payload.dictionaryId,
              p_code_lists: payload.codeLists.map(_codeListToRpcArg),
              p_entries: payload.entries.map(_entryToRpcArg),
            })
            .throwOnError();
          return data;
        },
      };
    },
  }),
  {
    mutationFns: ["saveContents"],
  },
);
