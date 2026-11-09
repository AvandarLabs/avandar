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
  id: string;
  concept_id: string;
  name: string;
  is_array: boolean;
  bucket_grain: string | null;
  data_type: string;
};
export type ConceptStatus = {
  concept_id: string;
  name: string;
  position: number;
};

/**
 * Datasets, concepts, field names, and status names a workspace chat turn
 * may name.
 */
export type WorkspaceChatSchema = {
  datasets: Dataset[];
  columns: DatasetColumn[];
  concepts: Concept[];
  conceptAttributes: ConceptAttribute[];
  conceptStatuses: ConceptStatus[];
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
}): Promise<{
  concepts: Concept[];
  conceptAttributes: ConceptAttribute[];
  conceptStatuses: ConceptStatus[];
}> {
  const { data: concepts } = await options.supabaseClient
    .from("concepts")
    .select("id, name, description")
    .eq("workspace_id", options.workspaceId)
    .throwOnError();

  if (!concepts || concepts.length === 0) {
    return { concepts: [], conceptAttributes: [], conceptStatuses: [] };
  }

  const conceptIds = concepts.map((concept: Concept) => {
    return concept.id;
  });
  // Statuses are their own select rather than a `concept_statuses (...)`
  // embed on `concepts`: two foreign keys join the tables (a status's case
  // type, and a case type's default status), which makes the embed ambiguous.
  const [{ data: conceptAttributes }, { data: conceptStatuses }] =
    await Promise.all([
      options.supabaseClient
        .from("concept_attributes")
        .select("id, concept_id, name, is_array, bucket_grain, data_type")
        .eq("workspace_id", options.workspaceId)
        .in("concept_id", conceptIds)
        .throwOnError(),
      options.supabaseClient
        .from("concept_statuses")
        .select("concept_id, name, position")
        .eq("workspace_id", options.workspaceId)
        .in("concept_id", conceptIds)
        .throwOnError(),
    ]);

  return {
    concepts,
    conceptAttributes: conceptAttributes ?? [],
    conceptStatuses: conceptStatuses ?? [],
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
