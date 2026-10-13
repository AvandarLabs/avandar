import { isDefined, prop, where } from "@avandar/utils";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeMappingClient } from "@/clients/ontology/AttributeMappingClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { hasPropKeys } from "@/lib/utils/guards/guards";
import { Logger } from "@/utils/Logger";
import {
  generateIndividuals,
  getAttributesWithMapping,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/index";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

function _mappingsFromAttributes(
  attributes: ConceptFormSubmitValues["attributes"],
  workspaceId: Workspace.Id,
): Array<AttributeMapping<"Insert">> {
  return attributes
    .map((attribute) => {
      const { mappingType, mappings } = attribute;
      return match(mappingType)
        .with("manual_entry", () => {
          return { ...mappings.manualEntry, workspaceId };
        })
        .with("dataset_column", () => {
          const datasetColumnMapping = mappings.datasetColumn;
          if (
            hasPropKeys(datasetColumnMapping, ["datasetId", "datasetColumnId"])
          ) {
            return { ...datasetColumnMapping, workspaceId };
          }
          return undefined;
        })
        .exhaustive();
    })
    .filter(isDefined);
}

/**
 * Re-fetches a freshly-inserted concept's attributes and mappings into the
 * shape `generateIndividuals` needs. Mirrors `useHydratedConcept`, as a plain
 * async function rather than a hook, since there is no component here to
 * call a hook from.
 */
async function _getFullConcept(concept: Concept.T): Promise<BuildableConcept> {
  const conceptAttributes = await ConceptAttributeClient.getAll(
    where("concept_id", "eq", concept.id),
  );
  const mappings = await ConceptAttributeClient.getAllAttributeMappings({
    attributes: conceptAttributes,
  });
  const datasetIds = [
    ...new Set(
      mappings
        .filter((mapping) => {
          return mapping.type === "dataset_column";
        })
        .map((mapping) => {
          return mapping.datasetId;
        }),
    ),
  ];
  const datasets =
    datasetIds.length > 0
      ? await DatasetClient.getAll(where("id", "in", datasetIds))
      : [];

  const attributesWithMappings = getAttributesWithMapping(
    conceptAttributes.map((attribute) => {
      return {
        ...attribute,
        mapping: mappings.find((mapping) => {
          return mapping.conceptAttributeId === attribute.id;
        }),
      };
    }),
  );

  return { ...concept, datasets, attributes: attributesWithMappings };
}

/** Fires the new concept's first sync in the background; never throws. */
function _syncNewConceptInBackground(concept: Concept.T): void {
  _getFullConcept(concept)
    .then((fullConcept) => {
      return generateIndividuals(fullConcept);
    })
    .catch((error: unknown) => {
      Logger.error(error, {
        msg: "Failed to auto-sync records for a newly created concept",
        conceptId: concept.id,
      });
    });
}

/**
 * Persists a concept, its attributes, and their mappings the same way the
 * concept creator form does, then triggers its first sync in the background.
 */
export async function insertConceptFromFormValues(
  conceptFormValues: ConceptFormSubmitValues,
): Promise<void> {
  const workspaceId = conceptFormValues.workspaceId;
  if (!workspaceId) {
    throw new Error("Concept insert requires a workspace id");
  }
  const concept = await ConceptClient.insert({
    data: { workspaceId, ...conceptFormValues },
  });
  const { attributes } = conceptFormValues;
  await ConceptAttributeClient.bulkInsert({
    data: attributes.map((attribute) => {
      return { workspaceId, ...attribute };
    }),
  });
  await AttributeMappingClient.bulkInsert({
    data: _mappingsFromAttributes(attributes, workspaceId),
  });

  _syncNewConceptInBackground(concept);
}

/** Deletes a concept and its attributes after a failed insert. */
export async function rollbackConceptFormInsert(
  conceptFormValues: ConceptFormSubmitValues,
): Promise<void> {
  await Promise.all([
    ConceptClient.delete({ id: conceptFormValues.id }),
    ConceptAttributeClient.bulkDelete({
      ids: conceptFormValues.attributes.map(prop("id")),
    }),
  ]);
}
