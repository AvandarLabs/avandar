import { codePairsToDBJson } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** A code list to seed, by name and pairs. */
export type SeedCodeList = {
  name: string;
  pairs: readonly DataDictionaryCodeList.Pair[];
};

/** One entry to seed, with the code lists it uses, if any. */
export type SeedEntry = {
  name: string;
  columnNames: readonly string[];
  kind: DataDictionaryEntry.Kind;
  description?: string;
  /** The entry's primary code list. */
  codeList?: SeedCodeList;
  /** More code lists the entry recognizes, after the primary one. */
  otherCodeLists?: readonly SeedCodeList[];
};

async function _getOwnerProfile(
  admin: AvaSupabaseDBClient,
  workspaceId: string,
): Promise<{ id: string; user_id: string }> {
  const { data: workspace } = await admin
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single()
    .throwOnError();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", workspace.owner_id)
    .single()
    .throwOnError();
  return profile;
}

async function _seedCodeList(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    dictionaryId: string;
    entryId: string;
    codeList: SeedCodeList;
    isPrimary: boolean;
  }>,
): Promise<void> {
  const { admin, workspaceId, dictionaryId } = options;
  const { data: codeList } = await admin
    .from("data_dictionaries__code_lists")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      name: options.codeList.name,
      pairs: codePairsToDBJson(options.codeList.pairs),
    })
    .select("id")
    .single()
    .throwOnError();
  await admin
    .from("data_dictionaries__entry_codings")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      entry_id: options.entryId,
      code_list_id: codeList.id,
      is_primary: options.isPrimary,
    })
    .throwOnError();
}

async function _seedEntry(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    dictionaryId: string;
    entry: SeedEntry;
    position: number;
  }>,
): Promise<void> {
  const { admin, workspaceId, dictionaryId, entry } = options;
  const { data: entryRow } = await admin
    .from("data_dictionaries__entries")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      name: entry.name,
      column_names: [...entry.columnNames],
      kind: entry.kind,
      description: entry.description ?? null,
      position: options.position,
    })
    .select("id")
    .single()
    .throwOnError();
  const codeLists = [
    ...(entry.codeList ? [{ codeList: entry.codeList, isPrimary: true }] : []),
    ...(entry.otherCodeLists ?? []).map((codeList) => {
      return { codeList, isPrimary: false };
    }),
  ];
  for (const { codeList, isPrimary } of codeLists) {
    await _seedCodeList({
      admin,
      workspaceId,
      dictionaryId,
      entryId: entryRow.id,
      codeList,
      isPrimary,
    });
  }
}

/**
 * Seeds a dictionary owned by the workspace owner, with its entries and
 * code lists, through the service role. Use it before the first page load
 * when a spec needs a dictionary to exist but does not test creating one,
 * for example a spec that applies a dictionary. Returns the dictionary id.
 */
export async function seedDataDictionary(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    name: string;
    entries: readonly SeedEntry[];
  }>,
): Promise<DataDictionary.Id> {
  const { admin, workspaceId } = options;
  const owner = await _getOwnerProfile(admin, workspaceId);
  const { data: dictionary } = await admin
    .from("data_dictionaries")
    .insert({
      workspace_id: workspaceId,
      owner_id: owner.user_id,
      owner_profile_id: owner.id,
      name: options.name,
    })
    .select("id")
    .single()
    .throwOnError();
  for (const [position, entry] of options.entries.entries()) {
    await _seedEntry({
      admin,
      workspaceId,
      dictionaryId: dictionary.id,
      entry,
      position,
    });
  }
  return dictionary.id as DataDictionary.Id;
}
