import { Model } from "@avandar/models";
import {
  assertIsDefined,
  isDefined,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { hasPropKeys } from "@/lib/utils/guards/guards";
import { Logger } from "@/utils/Logger";
import {
  generateIndividuals,
  getAttributesWithMapping,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptFormSubmitValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

/**
 * The mapping row of one dataset-column field, or undefined when the field
 * has no column yet. A field that keeps every value stores no rule: its
 * draft holds one only so the user can switch it back to one value.
 */
function _datasetColumnMappingFromAttribute(options: {
  attribute: ConceptFormSubmitValues["attributes"][number];
  workspaceId: Workspace.Id;
}): AttributeMapping<"Insert"> | undefined {
  const { attribute, workspaceId } = options;
  const datasetColumnMapping = attribute.mappings.datasetColumn;
  if (!hasPropKeys(datasetColumnMapping, ["datasetId", "datasetColumnId"])) {
    return undefined;
  }
  return match(ConceptAttribute.getValueShape(attribute))
    .with("single", () => {
      return { ...datasetColumnMapping, workspaceId };
    })
    .with("list", () => {
      return {
        ...datasetColumnMapping,
        valuePickerRuleType: undefined,
        workspaceId,
      };
    })
    .exhaustive();
}

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
          return _datasetColumnMappingFromAttribute({ attribute, workspaceId });
        })
        .exhaustive();
    })
    .filter(isDefined);
}

/** The form's status drafts as insert rows, numbered by their order. */
function _statusesFromFormValues(
  conceptFormValues: ConceptFormSubmitValues,
  workspaceId: Workspace.Id,
): Array<ConceptStatus.T<"Insert">> {
  return conceptFormValues.statuses.map((status, index) => {
    return Model.make("ConceptStatus", {
      id: status.id,
      workspaceId,
      conceptId: conceptFormValues.id,
      name: status.name.trim(),
      description: status.description.trim() || undefined,
      color: status.color,
      position: index,
    });
  });
}

/**
 * Fetches a freshly created concept with its attributes and mappings, in the
 * shape `generateIndividuals` needs. Mirrors `useHydratedConcept`, as a plain
 * async function rather than a hook, since there is no component here to
 * call a hook from.
 */
async function _getFullConcept(
  conceptId: Concept.Id,
): Promise<BuildableConcept> {
  const concept = await ConceptClient.getById({ id: conceptId });
  assertIsDefined(concept, `Concept ${conceptId} was not found after creation`);
  const conceptAttributes = await ConceptAttributeClient.getAll(
    where("concept_id", "eq", conceptId),
  );
  const mappings = await ConceptAttributeClient.getAllAttributeMappings({
    attributes: conceptAttributes,
  });
  const datasetIds = [
    ...new Set(
      mappings.filter(propEq("type", "dataset_column")).map(prop("datasetId")),
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
        mapping: mappings.find(propEq("conceptAttributeId", attribute.id)),
      };
    }),
  );

  return { ...concept, datasets, attributes: attributesWithMappings };
}

/** Fires the new concept's first sync in the background; never throws. */
function _syncNewConceptInBackground(conceptId: Concept.Id): void {
  _getFullConcept(conceptId)
    .then((fullConcept) => {
      return generateIndividuals(fullConcept);
    })
    .catch((error: unknown) => {
      Logger.error(error, {
        msg: "Failed to auto-sync records for a newly created concept",
        conceptId,
      });
    });
}

/**
 * Persists a concept with its statuses, attributes, and mappings in one
 * transaction, then triggers its first sync in the background. If creation
 * fails, nothing was written.
 */
export async function insertConceptFromFormValues(
  conceptFormValues: ConceptFormSubmitValues,
): Promise<void> {
  const workspaceId = conceptFormValues.workspaceId;
  if (!workspaceId) {
    throw new Error("Concept insert requires a workspace id");
  }
  const { attributes } = conceptFormValues;
  const conceptId = await ConceptClient.create({
    concept: { ...conceptFormValues, workspaceId },
    statuses: _statusesFromFormValues(conceptFormValues, workspaceId),
    attributes: attributes.map((attribute) => {
      return { ...attribute, workspaceId };
    }),
    mappings: _mappingsFromAttributes(attributes, workspaceId),
  });

  _syncNewConceptInBackground(conceptId);
}
