import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { AttributeMappingRegistry } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import { ManualEntryMapping } from "$/models/ontology/AttributeMapping/ManualEntryMapping/ManualEntryMapping.types";
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

export type AttributeFormValues = SetRequired<
  SetOptional<ConceptAttributeModel["Insert"], "workspaceId">,
  "id"
> & {
  mappings: {
    manualEntry: SetOptional<ManualEntryMapping<"Insert">, "workspaceId">;
    datasetColumn: SetOptional<
      DatasetColumnMapping<"Insert">,
      "datasetId" | "datasetColumnId" | "workspaceId"
    >;
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

  return Model.make("Concept", {
    id: conceptId,
    labelAttributeId: undefined,
    name: "",
    description: "",
    sourceDatasets: [],
    allowManualCreation: false,
    datasetColumnAttributes: [],
    manualEntryAttributes: [],
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
    name,
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
