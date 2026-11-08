import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { makeDefaultManualEntryAttribute } from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  ChatCaseSourceDataset,
  ChatCreatedCaseType,
} from "$/types/chat.types";
import type {
  AttributeFormValues,
  ConceptFormSubmitValues,
} from "@/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes";

type CatalogColumn = Pick<
  DatasetColumn.T,
  "id" | "datasetId" | "name" | "dataType"
>;

function _findColumn(
  columns: readonly CatalogColumn[],
  columnId: string,
): CatalogColumn | undefined {
  return columns.find((column) => {
    return column.id === columnId;
  });
}

function _makeMappedAttribute(options: {
  conceptId: ConceptId;
  name: string;
  description: string | undefined;
  column: CatalogColumn;
  isIdentifier: boolean;
  isLabel: boolean;
  valueShape: ConceptAttribute.ValueShape;
  valuePickerRuleType: ValuePickerRule.T;
}): AttributeFormValues {
  const conceptAttributeId = uuid<ConceptAttributeId>();
  // An identifier matches rows to a record and the label names it, so neither
  // is ever a list.
  const valueShape: ConceptAttribute.ValueShape =
    options.isIdentifier || options.isLabel ? "single" : options.valueShape;
  const columnDataType = options.column.dataType;
  // An identifier shows the key itself, so it never reduces the column. Any
  // other field's rule is replaced when the column's type does not allow it.
  const ruleType = options.isIdentifier
    ? ValuePickerRule.DEFAULT_RULE_TYPE
    : ValuePickerRule.toAllowedRuleType({
        ruleType: options.valuePickerRuleType,
        columnDataType,
      });
  return Model.make("ConceptAttribute", {
    id: conceptAttributeId,
    conceptId: options.conceptId,
    name: ConceptStatus.toNonReservedAttributeName(options.name),
    description: options.description,
    dataType: ConceptAttribute.getOutputDataType({
      valueShape,
      ruleType,
      columnDataType,
    }),
    mappingType: "dataset_column",
    isIdentifier: options.isIdentifier,
    isLabel: options.isLabel,
    allowManualEdit: false,
    isArray: ConceptAttribute.valueShapeToIsArray(valueShape),
    mappings: {
      manualEntry: {
        type: "manual_entry",
        conceptAttributeId,
      },
      datasetColumn: {
        type: "dataset_column",
        conceptAttributeId,
        valuePickerRuleType: ruleType,
        datasetId: options.column.datasetId,
        datasetColumnId: options.column.id,
      },
    },
  } as const);
}

/**
 * Every contributing dataset needs an identifier attribute mapped into it: the
 * concept's rows are matched by comparing each dataset's join key against the
 * spine, and a dataset that contributes a column without one makes the whole
 * concept throw when its relation is built. So a join key the caller did not
 * already map as an attribute is added here rather than left out.
 */
function _makeMissingIdentifierAttributes(options: {
  identities: readonly ChatCaseSourceDataset[];
  mapped: readonly AttributeFormValues[];
  conceptId: ConceptId;
  columns: readonly CatalogColumn[];
}): AttributeFormValues[] {
  const { identities, mapped, conceptId, columns } = options;
  const identifiedDatasetIds = new Set<string>(
    mapped
      .filter((attribute) => {
        return attribute.isIdentifier;
      })
      .map((attribute) => {
        return String(attribute.mappings.datasetColumn.datasetId);
      }),
  );
  return identities.flatMap((identity) => {
    if (identifiedDatasetIds.has(identity.datasetId)) {
      return [];
    }
    const column = _findColumn(columns, identity.primaryKeyColumnId);
    if (!column) {
      return [];
    }
    return [
      _makeMappedAttribute({
        conceptId,
        name: column.name,
        description: undefined,
        column,
        isIdentifier: true,
        isLabel: false,
        valueShape: "single",
        valuePickerRuleType: ValuePickerRule.DEFAULT_RULE_TYPE,
      }),
    ];
  });
}

function _attributesFromCaseType(options: {
  caseType: ChatCreatedCaseType;
  conceptId: ConceptId;
  columns: readonly CatalogColumn[];
}): AttributeFormValues[] {
  const { caseType, conceptId, columns } = options;
  const primaryKeyColumnIds = new Set(
    caseType.identities.map((identity) => {
      return identity.primaryKeyColumnId;
    }),
  );
  const mapped = caseType.attributes.flatMap((attribute) => {
    if (attribute.kind === "manual_entry") {
      return [
        makeDefaultManualEntryAttribute({
          conceptId,
          name: ConceptStatus.toNonReservedAttributeName(attribute.name),
        }),
      ];
    }
    const column = _findColumn(columns, attribute.columnId);
    if (!column) {
      return [];
    }
    return [
      _makeMappedAttribute({
        conceptId,
        name: attribute.name,
        description: attribute.description,
        column,
        isIdentifier: primaryKeyColumnIds.has(column.id),
        isLabel: attribute.isLabel === true,
        valueShape: attribute.valueShape ?? "single",
        valuePickerRuleType:
          attribute.valuePickerRuleType ?? ValuePickerRule.DEFAULT_RULE_TYPE,
      }),
    ];
  });
  return [
    ..._makeMissingIdentifierAttributes({
      identities: caseType.identities,
      mapped,
      conceptId,
      columns,
    }),
    ...mapped,
  ];
}

/**
 * Makes the first identifier the label when no attribute was marked as one,
 * then returns the label attribute.
 */
function _markFallbackLabel(
  attributes: readonly AttributeFormValues[],
): AttributeFormValues | undefined {
  const labelAttribute = attributes.find((attribute) => {
    return attribute.isLabel;
  });
  const identifier = attributes.find((attribute) => {
    return attribute.isIdentifier;
  });
  if (identifier && !labelAttribute) {
    identifier.isLabel = true;
  }
  return attributes.find((attribute) => {
    return attribute.isLabel;
  });
}

/**
 * Turns a chat-created case type into the payload the concept creator submits.
 * A case type may draw columns from several datasets, so each contributing
 * dataset's join key becomes its own identifier attribute.
 */
export function createdCaseTypeToFormValues(options: {
  caseType: ChatCreatedCaseType;
  workspaceId: Workspace.Id;
  columns: readonly CatalogColumn[];
}): ConceptFormSubmitValues {
  const conceptId = uuid<ConceptId>();
  const attributes = _attributesFromCaseType({
    caseType: options.caseType,
    conceptId,
    columns: options.columns,
  });
  const label = _markFallbackLabel(attributes);
  // Chat's statuses when it proposed some; the translated default set
  // otherwise, which is always the case for the `createCaseTypes` tool.
  const { statuses, defaultStatusId } = makeStatusSetValueFromChatStatuses(
    options.caseType,
  );
  return {
    ...Model.make("Concept", {
      id: conceptId,
      workspaceId: options.workspaceId,
      name: options.caseType.name,
      description: options.caseType.description,
      allowManualCreation: options.caseType.allowManualCreation,
      labelAttributeId: label?.id,
      sourceDatasets: [],
      datasetColumnAttributes: attributes.filter((attribute) => {
        return attribute.mappingType === "dataset_column";
      }),
      manualEntryAttributes: attributes.filter((attribute) => {
        return attribute.mappingType === "manual_entry";
      }),
      statuses,
      defaultStatusId,
    }),
    attributes,
  };
}
