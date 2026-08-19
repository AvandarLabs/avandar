import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

export type Dataset = { id: string; name: string; description?: string | null };
export type DatasetColumn = {
  id?: string;
  dataset_id: string;
  name: string;
  data_type: string;
};
export type Concept = {
  id: string;
  name: string;
  description?: string | null;
};
export type ConceptAttribute = {
  concept_id: string;
  name: string;
};

/** Datasets, concepts, and field names a workspace chat turn may name. */
export type WorkspaceChatSchema = {
  datasets: Dataset[];
  columns: DatasetColumn[];
  concepts: Concept[];
  conceptAttributes: ConceptAttribute[];
};

async function _fetchDatasets(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<{ datasets: Dataset[]; columns: DatasetColumn[] }> {
  const { data: datasets } = await options.supabaseClient
    .from("datasets")
    .select("id, name, description, workspace_id")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();

  if (!datasets || datasets.length === 0) {
    return { datasets: [], columns: [] };
  }

  const { data: columns } = await options.supabaseClient
    .from("dataset_columns")
    .select("id, dataset_id, name, data_type")
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

async function _fetchConcepts(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<{ concepts: Concept[]; conceptAttributes: ConceptAttribute[] }> {
  const { data: concepts } = await options.supabaseClient
    .from("concepts")
    .select("id, name, description")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();

  if (!concepts || concepts.length === 0) {
    return { concepts: [], conceptAttributes: [] };
  }

  const { data: conceptAttributes } = await options.supabaseClient
    .from("concept_attributes")
    .select("concept_id, name")
    .eq("workspace_id", options.workspaceId)
    .in(
      "concept_id",
      concepts.map((concept: Concept) => {
        return concept.id;
      }),
    )
    .throwOnError();

  return {
    concepts: concepts ?? [],
    conceptAttributes: conceptAttributes ?? [],
  };
}

/**
 * Loads the datasets, concepts, and names available to a workspace chat
 * request.
 */
export async function fetchWorkspaceSchema(options: {
  supabaseClient: AvaSupabaseClient;
  workspaceId: string;
}): Promise<WorkspaceChatSchema> {
  const [datasetSchema, conceptSchema] = await Promise.all([
    _fetchDatasets(options),
    _fetchConcepts(options),
  ]);
  return { ...datasetSchema, ...conceptSchema };
}
