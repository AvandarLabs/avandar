import { where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";

// Stable defaults, so a list still loading is the same array every render.
const NO_CONCEPTS: Concept.T[] = [];
const NO_DATASETS: Dataset.T[] = [];

/** The case types and datasets of a workspace a data slot can read. */
export type DataSlotSourceOptions = Readonly<{
  concepts: readonly Concept.T[];
  datasets: readonly Dataset.T[];
  isLoading: boolean;
}>;

/**
 * Loads every case type and dataset of a workspace, the sources a data slot
 * can be bound to. Use it wherever a slot's source is picked or named, for
 * example the source picker of a data slot panel or a summary of the slots
 * an admin bound.
 */
export function useDataSlotSourceOptions(
  workspaceId: Workspace.Id,
): DataSlotSourceOptions {
  const [concepts = NO_CONCEPTS, isLoadingConcepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [datasets = NO_DATASETS, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  return {
    concepts,
    datasets,
    isLoading: isLoadingConcepts || isLoadingDatasets,
  };
}
