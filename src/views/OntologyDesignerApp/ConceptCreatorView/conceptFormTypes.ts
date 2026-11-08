import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { AttributeMappingRegistry } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import { ManualEntryMapping } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMapping.types";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import { makeDefaultStatusDrafts } from "@/views/OntologyDesignerApp/makeDefaultStatusDrafts/makeDefaultStatusDrafts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type {
  ConceptId,
  ConceptModel,
} from "$/models/ontology/Concept/Concept.types";
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import type { FormType } from "@avandar/ui/hooks";
import type { CamelCaseKeys, Expect } from "@avandar/utils";
import type { SetOptional, SetRequired } from "type-fest";

/**
 * The form's dataset-column mapping. The model lets a mapping name no rule,
 * which is how a field that keeps every value is stored. The form always
 * holds one, so the rule select always has a value to show.
 */
type DatasetColumnMappingFormValues = SetOptional<
  DatasetColumnMapping<"Insert">,
  "datasetId" | "datasetColumnId" | "workspaceId"
> & { valuePickerRuleType: ValuePickerRule.T };

export type AttributeFormValues = SetRequired<
  SetOptional<ConceptAttributeModel["Insert"], "workspaceId">,
  "id"
> & {
  mappings: {
    manualEntry: SetOptional<ManualEntryMapping<"Insert">, "workspaceId">;
    datasetColumn: DatasetColumnMappingFormValues;
  };
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// Type test to make sure `AttributeFormValues.mappings` has definitions for
// all valid mappings
type _Test_AttributeFormValues = Expect<
  AttributeFormValues["mappings"] extends {
    [T in keyof CamelCaseKeys<AttributeMappingRegistry>]: Partial<
      CamelCaseKeys<AttributeMappingRegistry>[T]
    >;
  }
    ? true
    : false
>;

export type ConceptFormValues = SetOptional<
  SetRequired<ConceptModel["Insert"], "id">,
  "workspaceId"
> & {
  /** The id of the attribute that should be used as the title attribute */
  labelAttributeId: ConceptAttributeId | undefined;

  /**
   * If any attributes are configured as datasetColumn mappings,
   * this array holds the ids of the datasets we will extract from,
   * coupled with the id of the column to use as the primary key.
   */
  sourceDatasets: ReadonlyArray<{
    dataset: DatasetWithColumns;
    primaryKeyColumnId?: DatasetColumnId;
  }>;
  datasetColumnAttributes: readonly AttributeFormValues[];
  manualEntryAttributes: readonly AttributeFormValues[];

  /**
   * The case type's statuses, in display order. `defaultStatusId`, from the
   * concept insert type, names the one new records start in.
   */
  statuses: readonly ConceptStatus.Draft[];
};

export type ConceptFormSubmitValues = ConceptFormValues & {
  attributes: AttributeFormValues[];
};

export type ConceptFormType = FormType<
  ConceptFormValues,
  ConceptFormSubmitValues
>;

export function getDefaultConceptFormValues(): ConceptFormValues {
  const conceptId: ConceptId = uuid();
  const { statuses, defaultStatusId } = makeDefaultStatusDrafts();

  return Model.make("Concept", {
    id: conceptId,
    labelAttributeId: undefined,
    name: "",
    description: "",
    sourceDatasets: [],
    allowManualCreation: false,
    datasetColumnAttributes: [],
    manualEntryAttributes: [],
    statuses,
    defaultStatusId,
  });
}

export function makeDefaultDatasetColumnAttribute({
  conceptId,
  name,
  dataset,
  datasetColumn,
  isIdentifier = false,
}: {
  conceptId: ConceptId;
  name: string;
  dataset: Dataset.T;
  datasetColumn: DatasetColumnRead;
  isIdentifier?: boolean;
}): AttributeFormValues {
  const conceptAttributeId: ConceptAttributeId = uuid();
  return Model.make("ConceptAttribute", {
    id: conceptAttributeId,
    conceptId,
    // A field takes its column's name, and the form has no input to rename
    // it, so a column called "status" is renamed here rather than rejected.
    name: ConceptStatus.toNonReservedAttributeName(name),
    description: undefined,
    dataType: datasetColumn.dataType,
    mappingType: "dataset_column",
    isIdentifier,
    isLabel: false,
    allowManualEdit: false,
    isArray: false,

    // set up some default initial values for the value mapping configs
    mappings: {
      manualEntry: {
        type: "manual_entry",
        conceptAttributeId,
      },
      datasetColumn: {
        type: "dataset_column",
        conceptAttributeId,
        valuePickerRuleType: "most_frequent",
        datasetId: dataset.id,
        datasetColumnId: datasetColumn.id,
      },
    },
  } as const);
}

export function makeDefaultManualEntryAttribute({
  conceptId,
  name,
}: {
  conceptId: ConceptId;
  name: string;
}): AttributeFormValues {
  const conceptAttributeId: ConceptAttributeId = uuid();
  return Model.make("ConceptAttribute", {
    id: conceptAttributeId,
    conceptId,
    name,
    description: undefined,
    dataType: "varchar",
    mappingType: "manual_entry",
    isIdentifier: false,
    isLabel: false,
    allowManualEdit: false,
    isArray: false,

    // set up some default initial values for the value mapping configs
    mappings: {
      manualEntry: {
        type: "manual_entry",
        conceptAttributeId,
      },
      datasetColumn: {
        type: "dataset_column",
        conceptAttributeId,
        valuePickerRuleType: "most_frequent",
        datasetId: undefined,
        datasetColumnId: undefined,
      },
    },
  } as const);
}

/** Returns the attribute with its value rule set to `ruleType`. */
function _withValueRule(
  attribute: AttributeFormValues,
  ruleType: ValuePickerRule.T,
): AttributeFormValues {
  return {
    ...attribute,
    mappings: {
      ...attribute.mappings,
      datasetColumn: {
        ...attribute.mappings.datasetColumn,
        valuePickerRuleType: ruleType,
      },
    },
  };
}

/**
 * Returns the attributes with each dataset-column field's `dataType` set to
 * the type it stores, reading each column's type from `sourceDatasets`. A
 * field that keeps every value stores its column's type, because each element
 * is one of the column's values. A field that keeps one value stores its
 * rule's output type.
 *
 * While the user edits, the form keeps `dataType` as the column's type, and
 * the rule select and "Only allow one value" both change what the field
 * stores, so the stored type is set once, on submit. A rule the column's
 * type refuses is replaced by the default rule first, as the chat path does.
 * A field whose column is not among `sourceDatasets` is returned unchanged.
 */
export function withFieldDataTypes(
  options: Readonly<{
    attributes: readonly AttributeFormValues[];
    sourceDatasets: ConceptFormValues["sourceDatasets"];
  }>,
): AttributeFormValues[] {
  const columnDataTypesById = new Map<string, AvaDataType.T>(
    options.sourceDatasets.flatMap(({ dataset }) => {
      return dataset.columns.map((column) => {
        return [column.id, column.dataType] as const;
      });
    }),
  );
  return options.attributes.map((attribute) => {
    if (attribute.mappingType !== "dataset_column") {
      return attribute;
    }
    const { datasetColumnId, valuePickerRuleType } =
      attribute.mappings.datasetColumn;
    const columnDataType = datasetColumnId
      ? columnDataTypesById.get(datasetColumnId)
      : undefined;
    if (columnDataType === undefined) {
      return attribute;
    }
    const ruleType = ValuePickerRule.toAllowedRuleType({
      ruleType: valuePickerRuleType,
      columnDataType,
    });
    return {
      ..._withValueRule(attribute, ruleType),
      dataType: attribute.isArray
        ? columnDataType
        : ValuePickerRule.getOutputDataType({ ruleType, columnDataType }),
    };
  });
}

/**
 * Returns the attribute with its value rule set to the default rule. An
 * identifier shows the key itself, so it never reduces its column, and the
 * default rule is the one every column type allows and that keeps the
 * column's type.
 */
export function withDefaultValueRule(
  attribute: AttributeFormValues,
): AttributeFormValues {
  return _withValueRule(attribute, ValuePickerRule.DEFAULT_RULE_TYPE);
}
