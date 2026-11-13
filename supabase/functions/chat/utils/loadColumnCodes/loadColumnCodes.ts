import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/**
 * Each binding with the dictionary, entry, and code list it names, embedded
 * through the binding's foreign keys. Row level security applies to every
 * embedded table, so a reader who cannot see a dictionary gets null.
 */
const BINDING_SELECT =
  "dataset_column_id, mode, direction, dictionary:data_dictionaries(id, name), entry:data_dictionaries__entries(id, name, description), code_list:data_dictionaries__code_lists(id, name, is_ordered, pairs)";

async function _readColumnCodes(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; workspaceId: string }>,
): Promise<Map<string, ColumnCodes.T>> {
  const { data } = await options.supabaseClient
    .from("dataset_columns__dictionary_bindings")
    .select(BINDING_SELECT)
    .eq("workspace_id", options.workspaceId)
    .throwOnError();
  const rows = data ?? [];
  return ColumnCodes.fromRows({
    bindings: rows.map((row) => {
      return {
        datasetColumnId: row.dataset_column_id,
        dictionaryId: row.dictionary?.id,
        entryId: row.entry?.id,
        codeListId: row.code_list?.id,
        mode: row.mode,
        direction: row.direction,
      };
    }),
    dictionaries: rows.flatMap((row) => {
      return row.dictionary ? [row.dictionary] : [];
    }),
    entries: rows.flatMap((row) => {
      return row.entry
        ? [{ ...row.entry, description: row.entry.description ?? undefined }]
        : [];
    }),
    codeLists: rows.flatMap((row) => {
      return row.code_list
        ? [
            {
              id: row.code_list.id,
              name: row.code_list.name,
              isOrdered: row.code_list.is_ordered,
              pairs: ColumnCodes.fromStoredPairs(row.code_list.pairs),
            },
          ]
        : [];
    }),
  });
}

/**
 * What every attached dictionary says about the workspace's bound columns,
 * by dataset column id, read with the caller's own permissions. Used where
 * the `chat` function tells a model about datasets, for example the data
 * agent's prompt. Codes only add context, so a failed read logs and returns
 * none rather than failing the request.
 */
export async function loadColumnCodes(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; workspaceId: string }>,
): Promise<Map<string, ColumnCodes.T>> {
  try {
    return await _readColumnCodes(options);
  } catch (error) {
    console.error("Could not read column code lists", error);
    return new Map();
  }
}
