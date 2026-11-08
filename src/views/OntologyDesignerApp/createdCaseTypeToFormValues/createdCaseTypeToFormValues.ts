import { Model } from "@avandar/models";
import { match } from "ts-pattern";
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
  ChatCreatedCaseAttribute,
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

/**
 * How a mapped attribute keeps its values. A per-period attribute carries
 * its period and its date column, already checked against the catalog.
 */
type MappedAttributeShape =
  | { valueShape: "single" | "list" }
  | {
      valueShape: "bucketed_list";
      bucketGrain: ConceptAttribute.BucketGrain;
      bucketColumnId: DatasetColumn.Id;
    };

/**
 * A chat attribute's shape, checked against the catalog, or `undefined` for
 * a per-period attribute whose date column is unknown, belongs to another
 * dataset, or is not a date or timestamp. Such an attribute is dropped, the
 * way an unknown column id is.
 */
function _getShapeFromCatalog(
  options: Readonly<{
    attribute: Extract<ChatCreatedCaseAttribute, { kind: "dataset_column" }>;
    column: CatalogColumn;
    columns: readonly CatalogColumn[];
  }>,
): MappedAttributeShape | undefined {
  const { attribute, column, columns } = options;
  return match(attribute.valueShape ?? "single")
    .with("single", "list", (valueShape): MappedAttributeShape => {
      return { valueShape };
    })
    .with("bucketed_list", (): MappedAttributeShape | undefined => {
      const bucketColumn =
        attribute.bucketColumnId === undefined
          ? undefined
          : _findColumn(columns, attribute.bucketColumnId);
      if (
        attribute.bucketGrain === undefined ||
        bucketColumn === undefined ||
        bucketColumn.datasetId !== column.datasetId ||
        !ConceptAttribute.isBucketDateColumnType(bucketColumn.dataType)
      ) {
        return undefined;
      }
      return {
        valueShape: "bucketed_list",
        bucketGrain: attribute.bucketGrain,
        bucketColumnId: bucketColumn.id,
      };
    })
    .exhaustive();
}

/** The mappings of a field that reads one dataset column. */
function _createMappingsFromColumn(options: {
  conceptAttributeId: ConceptAttributeId;
  ruleType: ValuePickerRule.T;
  column: CatalogColumn;
  bucketColumnId: DatasetColumn.Id | undefined;
}): AttributeFormValues["mappings"] {
  const { conceptAttributeId, ruleType, column } = options;
  return {
    manualEntry: {
      type: "manual_entry",
      conceptAttributeId,
    },
    datasetColumn: {
      type: "dataset_column",
      conceptAttributeId,
      valuePickerRuleType: ruleType,
      datasetId: column.datasetId,
      datasetColumnId: column.id,
      bucketColumnId: options.bucketColumnId,
    },
  };
}

/**
 * The rule a mapped field stores. An identifier shows the key itself, so it
 * never reduces the column. Any other field's rule is replaced when the
 * column's type does not allow it.
 */
function _getStoredRuleType(
  options: Readonly<{
    isIdentifier: boolean;
    valuePickerRuleType: ValuePickerRule.T;
    columnDataType: CatalogColumn["dataType"];
  }>,
): ValuePickerRule.T {
  return options.isIdentifier
    ? ValuePickerRule.DEFAULT_RULE_TYPE
    : ValuePickerRule.toAllowedRuleType({
        ruleType: options.valuePickerRuleType,
        columnDataType: options.columnDataType,
      });
}

function _makeMappedAttribute(options: {
  conceptId: ConceptId;
  name: string;
  description: string | undefined;
  column: CatalogColumn;
  isIdentifier: boolean;
  isLabel: boolean;
  shape: MappedAttributeShape;
  valuePickerRuleType: ValuePickerRule.T;
}): AttributeFormValues {
  const conceptAttributeId = uuid<ConceptAttributeId>();
  // An identifier matches rows to a record and the label names it, so
  // neither is ever a list of either kind.
  const shape: MappedAttributeShape =
    options.isIdentifier || options.isLabel
      ? { valueShape: "single" }
      : options.shape;
  const { valueShape } = shape;
  const bucket = shape.valueShape === "bucketed_list" ? shape : undefined;
  const columnDataType = options.column.dataType;
  const ruleType = _getStoredRuleType({ ...options, columnDataType });
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
    bucketGrain: bucket?.bucketGrain,
    mappings: _createMappingsFromColumn({
      conceptAttributeId,
      ruleType,
      column: options.column,
      bucketColumnId: bucket?.bucketColumnId,
    }),
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
        shape: { valueShape: "single" },
        valuePickerRuleType: ValuePickerRule.DEFAULT_RULE_TYPE,
      }),
    ];
  });
}

/**
 * A chat attribute's shape. A join key and the label keep one value and
 * resolve no date column, so a bad period never drops them. Any other
 * attribute's shape is checked against the catalog.
 */
function _getShapeForAttribute(
  options: Readonly<{
    attribute: Extract<ChatCreatedCaseAttribute, { kind: "dataset_column" }>;
    column: CatalogColumn;
    columns: readonly CatalogColumn[];
    isIdentifier: boolean;
  }>,
): MappedAttributeShape | undefined {
  return options.isIdentifier || options.attribute.isLabel === true
    ? { valueShape: "single" }
    : _getShapeFromCatalog(options);
}

/**
 * The form field a chat attribute that reads a dataset column becomes, or
 * none when its column, or a per-period attribute's date column, is not in
 * the catalog.
 */
function _makeAttributesFromDatasetColumnAttribute(
  options: Readonly<{
    attribute: Extract<ChatCreatedCaseAttribute, { kind: "dataset_column" }>;
    conceptId: ConceptId;
    columns: readonly CatalogColumn[];
    primaryKeyColumnIds: ReadonlySet<string>;
  }>,
): AttributeFormValues[] {
  const { attribute, columns } = options;
  const column = _findColumn(columns, attribute.columnId);
  if (!column) {
    return [];
  }
  const isIdentifier = options.primaryKeyColumnIds.has(column.id);
  const shape = _getShapeForAttribute({
    attribute,
    column,
    columns,
    isIdentifier,
  });
  if (shape === undefined) {
    return [];
  }
  return [
    _makeMappedAttribute({
      conceptId: options.conceptId,
      name: attribute.name,
      description: attribute.description,
      column,
      isIdentifier,
      isLabel: attribute.isLabel === true,
      shape,
      valuePickerRuleType:
        attribute.valuePickerRuleType ?? ValuePickerRule.DEFAULT_RULE_TYPE,
    }),
  ];
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
    return _makeAttributesFromDatasetColumnAttribute({
      attribute,
      conceptId,
      columns,
      primaryKeyColumnIds,
    });
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
