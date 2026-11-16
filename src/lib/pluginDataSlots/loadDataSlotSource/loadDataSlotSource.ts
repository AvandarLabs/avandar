import { where } from "@avandar/utils";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";

async function _loadConceptSource(
  conceptId: Concept.Id | undefined,
): Promise<DataSlotSource | undefined> {
  if (conceptId === undefined) {
    return undefined;
  }
  const [concept, attributes] = await Promise.all([
    ConceptClient.getById({ id: conceptId }),
    ConceptAttributeClient.getAll(where("concept_id", "eq", conceptId)),
  ]);
  return concept === undefined
    ? undefined
    : makeDataSlotSourceFromConcept({ concept, attributes });
}

async function _loadDatasetSource(
  datasetId: Dataset.Id | undefined,
): Promise<DataSlotSource | undefined> {
  if (datasetId === undefined) {
    return undefined;
  }
  const [dataset, columns] = await Promise.all([
    DatasetClient.getById({ id: datasetId }),
    DatasetColumnClient.getAll(where("dataset_id", "eq", datasetId)),
  ]);
  return dataset === undefined
    ? undefined
    : makeDataSlotSourceFromDataset({ dataset, columns });
}

/**
 * Reads the case type or dataset a data slot binding names, with its
 * fields, as a data slot source. Undefined when the binding's source was
 * deleted or the current user cannot read it, which a binding status reads
 * as a missing source. Not a hook, so the command runtime can call it as
 * well as the settings UI.
 */
export async function loadDataSlotSource(
  options: Readonly<{
    sourceType: PluginDataSlotBinding.SourceType;
    conceptId: Concept.Id | undefined;
    datasetId: Dataset.Id | undefined;
  }>,
): Promise<DataSlotSource | undefined> {
  return await match(options.sourceType)
    .with("concept", () => {
      return _loadConceptSource(options.conceptId);
    })
    .with("dataset", () => {
      return _loadDatasetSource(options.datasetId);
    })
    .exhaustive();
}
