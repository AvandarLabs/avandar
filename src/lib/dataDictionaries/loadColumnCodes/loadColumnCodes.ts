import { where } from "@avandar/utils";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DataDictionaryEntryClient } from "@/clients/dataDictionaries/DataDictionaryEntryClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { Logger } from "@/utils/Logger";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Reads the workspace's bindings, then their dictionaries' entries and code
 * lists by dictionary id, so the request stays short however many columns
 * are bound.
 */
async function _readColumnCodes(
  workspaceId: Workspace.Id,
): Promise<Map<string, ColumnCodes.T>> {
  const bindings = await DictionaryBindingClient.getAll(
    where("workspace_id", "eq", workspaceId),
  );
  const { dictionaryIds } = ColumnCodes.getRowIdsFromBindings(bindings);
  if (dictionaryIds.length === 0) {
    return new Map();
  }
  const byDictionary = where("dictionary_id", "in", dictionaryIds);
  const [dictionaries, entries, codeLists] = await Promise.all([
    DataDictionaryClient.getAll(where("id", "in", dictionaryIds)),
    DataDictionaryEntryClient.getAll(byDictionary),
    DataDictionaryCodeListClient.getAll(byDictionary),
  ]);
  return ColumnCodes.fromRows({ bindings, dictionaries, entries, codeLists });
}

/**
 * What every attached dictionary says about the workspace's bound columns,
 * by dataset column id, read with the user's own permissions. A column whose
 * dictionary the user cannot read is left out. Used where a model is told
 * about datasets, for example the data agent's dataset schema. Codes only
 * add context, so a failed read logs and returns none rather than stopping
 * the schema from loading.
 */
export async function loadColumnCodes(
  workspaceId: Workspace.Id,
): Promise<Map<string, ColumnCodes.T>> {
  try {
    return await _readColumnCodes(workspaceId);
  } catch (error) {
    Logger.error(error);
    return new Map();
  }
}
