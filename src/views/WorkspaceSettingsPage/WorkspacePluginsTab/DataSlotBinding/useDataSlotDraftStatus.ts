import { where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

/** A data slot draft's source, and the status the draft would save with. */
export type DataSlotDraftStatus = Readonly<{
  /** The case type or dataset the draft names, once its fields load. */
  source: DataSlotSource | undefined;
  isLoadingSource: boolean;

  /** Undefined until there is a slot, a draft, and its loaded source. */
  status: DataSlotBindingStatus | undefined;
}>;

/**
 * Loads the case type or dataset a data slot draft names, with its fields,
 * and works out the status the draft would have if saved. A draft is ready
 * to save once the status is `bound`. Use it wherever a draft is edited or
 * saved, for example the data slot panel and the button that saves it.
 */
export function useDataSlotDraftStatus(options: {
  slot: PluginDataSlot | undefined;
  draft: PluginDataSlotBinding.Draft | undefined;
}): DataSlotDraftStatus {
  const { slot, draft } = options;
  const workspace = useCurrentWorkspace();
  const { concepts, datasets } = useDataSlotSourceOptions(workspace.id);
  const conceptId =
    draft?.sourceType === "concept" ? draft.conceptId : undefined;
  const datasetId =
    draft?.sourceType === "dataset" ? draft.datasetId : undefined;
  const [attributes, isLoadingAttributes] = ConceptAttributeClient.useGetAll({
    ...where("concept_id", "eq", conceptId),
    useQueryOptions: { enabled: conceptId !== undefined },
  });
  const [columns, isLoadingColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: { enabled: datasetId !== undefined },
  });
  const concept = concepts.find((candidate) => {
    return candidate.id === conceptId;
  });
  const dataset = datasets.find((candidate) => {
    return candidate.id === datasetId;
  });
  const source =
    concept !== undefined && attributes !== undefined
      ? makeDataSlotSourceFromConcept({ concept, attributes })
      : dataset !== undefined && columns !== undefined
        ? makeDataSlotSourceFromDataset({ dataset, columns })
        : undefined;
  return {
    source,
    isLoadingSource: isLoadingAttributes || isLoadingColumns,
    status:
      slot === undefined || draft === undefined || source === undefined
        ? undefined
        : getDataSlotBindingStatus({ slot, binding: draft, source }),
  };
}
