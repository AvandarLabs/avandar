import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type ColumnRow = { dataset_id: string; name: string; data_type: string };

/**
 * The workspace's datasets and columns for the data agent's prompt, read
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
  const { data: columns } = await options.supabaseClient
    .from("dataset_columns")
    .select("dataset_id, name, data_type")
    .eq("workspace_id", options.workspaceId)
    .order("column_idx")
    .throwOnError();
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
          return { name: column.name, dataType: column.data_type };
        }),
    };
  });
}
