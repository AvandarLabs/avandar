import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** One code pair as `data_dictionaries__code_lists.pairs` stores it. */
type StoredPair = {
  code: string;
  label: string;
  accepted_spellings: string[];
  is_missing: boolean;
};

/** One entry to seed, with the code list it uses, if any. */
export type SeedEntry = {
  name: string;
  columnNames: readonly string[];
  kind: "categorical" | "identifier";
  description?: string;
  codeList?: { name: string; pairs: readonly StoredPair[] };
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
  const { data: row } = await admin
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
  if (!entry.codeList) {
    return;
  }
  const { data: list } = await admin
    .from("data_dictionaries__code_lists")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      name: entry.codeList.name,
      pairs: [...entry.codeList.pairs],
    })
    .select("id")
    .single()
    .throwOnError();
  await admin
    .from("data_dictionaries__entry_codings")
    .insert({
      workspace_id: workspaceId,
      dictionary_id: dictionaryId,
      entry_id: row.id,
      code_list_id: list.id,
      is_primary: true,
    })
    .throwOnError();
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
): Promise<string> {
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
  return dictionary.id;
}
