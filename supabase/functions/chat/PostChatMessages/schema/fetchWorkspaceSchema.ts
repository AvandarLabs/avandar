import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

export type Dataset = { id: string; name: string };
export type DatasetColumn = {
  dataset_id: string;
  name: string;
  data_type: string;
};

/** Loads the datasets and columns available to a workspace chat request. */
export async function fetchWorkspaceSchema(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<{ datasets: Dataset[]; columns: DatasetColumn[] }> {
  const { data: datasets } = await options.supabaseClient
    .from("datasets")
    .select("id, name, workspace_id")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();

  if (!datasets || datasets.length === 0) {
    return { datasets: [], columns: [] };
  }

  const { data: columns } = await options.supabaseClient
    .from("dataset_columns")
    .select("dataset_id, name, data_type")
    .eq("workspace_id", options.workspaceId)
    .in(
      "dataset_id",
      datasets.map((dataset: Dataset) => {
        return dataset.id;
      }),
    )
    .throwOnError();

  return { datasets: datasets ?? [], columns: columns ?? [] };
}
