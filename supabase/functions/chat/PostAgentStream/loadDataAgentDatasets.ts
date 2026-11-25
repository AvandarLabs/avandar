import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type ColumnRow = {
  id: string;
  dataset_id: string;
  name: string;
  data_type: string;
};

function _toAgentColumn(
  column: Readonly<ColumnRow>,
  codesByColumnId: ReadonlyMap<string, ColumnCodes.T>,
): DataAgentDataset["columns"][number] {
  const codes = codesByColumnId.get(column.id);
  return {
    name: column.name,
    dataType: column.data_type,
    ...(codes ? { codes: ColumnCodes.toContext(codes) } : {}),
  };
}

/**
 * The workspace's datasets and columns for the data agent's prompt, with the
 * code list and description of each column a dictionary is attached to, read
 * with the caller's own permissions. Columns come in their dataset's order
 * (`column_idx`), so the prompt is the same on every request and stays in
 * the provider's cache.
 */
export async function loadDataAgentDatasets(
  options: Readonly<{ supabaseClient: AvaSupabaseClient; workspaceId: string }>,
): Promise<DataAgentDataset[]> {
  const { data: datasets } = await options.supabaseClient
    .from("datasets")
    .select("id, name")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();
  if (!datasets || datasets.length === 0) {
    return [];
  }
  const [{ data: columns }, codesByColumnId] = await Promise.all([
    options.supabaseClient
      .from("dataset_columns")
      .select("id, dataset_id, name, data_type")
      .eq("workspace_id", options.workspaceId)
      .order("column_idx")
      .throwOnError(),
    loadColumnCodes(options),
  ]);
  const rows = (columns ?? []) as ColumnRow[];
  return datasets.map((dataset: { id: string; name: string }) => {
    return {
      id: dataset.id,
      name: dataset.name,
      columns: rows
        .filter((column) => {
          return column.dataset_id === dataset.id;
        })
        .map((column) => {
          return _toAgentColumn(column, codesByColumnId);
        }),
    };
  });
}
