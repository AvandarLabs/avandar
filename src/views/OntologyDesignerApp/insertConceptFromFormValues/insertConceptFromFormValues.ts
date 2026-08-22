import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

import { isDefined, prop } from "@avandar/utils";
import { match } from "ts-pattern";

import { AttributeMappingClient } from "@/clients/ontology/AttributeMappingClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { hasPropKeys } from "@/lib/utils/guards/guards";

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
 * Persists a concept, its attributes, and their mappings the same way the
 * concept creator form does.
 */
export async function insertConceptFromFormValues(
  conceptFormValues: ConceptFormSubmitValues,
): Promise<void> {
  const workspaceId = conceptFormValues.workspaceId;
  if (!workspaceId) {
    throw new Error("Concept insert requires a workspace id");
  }
  await ConceptClient.insert({
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
