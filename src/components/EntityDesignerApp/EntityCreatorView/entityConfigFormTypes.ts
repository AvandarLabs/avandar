import { CamelCaseKeys } from "camelcase-keys";
import { SetOptional, SetRequired } from "type-fest";
import { Expect } from "@/lib/types/testUtilityTypes";
import { uuid } from "@/lib/utils/uuid";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig, EntityConfigId } from "@/models/EntityConfig/types";
import { AggregationExtractor } from "@/models/EntityConfig/ValueExtractor/AggregationExtractor/types";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";
import { ManualEntryExtractor } from "@/models/EntityConfig/ValueExtractor/ManualEntryExtractor/types";
import { EntityFieldValueExtractorRegistry } from "@/models/EntityConfig/ValueExtractor/types";
import { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import { getEntityFieldBaseDataType } from "@/models/LocalDataset/LocalDatasetField/utils";
import { LocalDataset } from "@/models/LocalDataset/types";

export type EntityFieldFormValues = SetRequired<
  EntityFieldConfig<"Insert">,
  "id"
> & {
  extractors: {
    aggregation: SetOptional<
      AggregationExtractor<"Insert">,
      "datasetId" | "datasetFieldId"
    >;
    manualEntry: ManualEntryExtractor<"Insert">;
    datasetColumnValue: SetOptional<
      DatasetColumnValueExtractor<"Insert">,
      "datasetId" | "datasetFieldId"
    >;
  };
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// Type test to make sure `EntityFieldFormValues.extractors` has definitions for
// all valid extractors
type _Test_EntityFieldFormValues = Expect<
  EntityFieldFormValues["extractors"] extends {
    [T in keyof CamelCaseKeys<EntityFieldValueExtractorRegistry>]: Partial<
      CamelCaseKeys<EntityFieldValueExtractorRegistry>[T]
    >;
  } ?
    true
  : false
>;

export type EntityConfigFormValues = SetRequired<
  EntityConfig<"Insert">,
  "id"
> & {
  titleFieldId?: EntityFieldConfigId;
  idFieldId?: EntityFieldConfigId;
  datasetColumnFields: EntityFieldFormValues[];
  manualEntryFields: EntityFieldFormValues[];
};

export type EntityConfigFormSubmitValues = EntityConfigFormValues & {
  fields: EntityFieldFormValues[];
};

export function getDefaultEntityConfigFormValues(): EntityConfigFormValues {
  const entityConfigId: EntityConfigId = uuid();

  return {
    id: entityConfigId,
    name: "",
    description: "",
    datasetId: undefined,
    allowManualCreation: false,
    datasetColumnFields: [],
    manualEntryFields: [],
  };
}

export function makeDefaultDatasetColumnField({
  entityConfigId,
  name,
  dataset,
  datasetColumn,
}: {
  entityConfigId: EntityConfigId;
  name: string;
  dataset: LocalDataset;
  datasetColumn: LocalDatasetField;
}): EntityFieldFormValues {
  const entityFieldConfigId: EntityFieldConfigId = uuid();
  return {
    id: entityFieldConfigId,
    entityConfigId,
    name,
    description: undefined,
    options: {
      class: "dimension",
      baseDataType: getEntityFieldBaseDataType(datasetColumn.dataType),
      valueExtractorType: "dataset_column_value",
      isIdField: false,
      isTitleField: false,
      allowManualEdit: false,
      isArray: false,
    },

    // set up some default initial values for the value extractor configs
    extractors: {
      aggregation: {
        type: "aggregation",
        entityFieldConfigId,
        aggregationType: "sum",
        datasetId: undefined,
        datasetFieldId: undefined,
        filter: undefined,
      },
      manualEntry: {
        type: "manual_entry",
        entityFieldConfigId,
      },
      datasetColumnValue: {
        type: "dataset_column_value",
        entityFieldConfigId,
        valuePickerRuleType: "most_frequent",
        datasetId: dataset.id,
        datasetFieldId: datasetColumn.id,
      },
    },
  };
}

export function makeDefaultManualEntryField({
  entityConfigId,
  name,
}: {
  entityConfigId: EntityConfigId;
  name: string;
}): EntityFieldFormValues {
  const entityFieldConfigId: EntityFieldConfigId = uuid();
  return {
    id: entityFieldConfigId,
    entityConfigId,
    name,
    description: undefined,
    options: {
      class: "dimension",
      baseDataType: "string",
      valueExtractorType: "manual_entry",
      isIdField: false,
      isTitleField: false,
      allowManualEdit: false,
      isArray: false,
    },

    // set up some default initial values for the value extractor configs
    extractors: {
      aggregation: {
        type: "aggregation",
        entityFieldConfigId,
        aggregationType: "sum",
        datasetId: undefined,
        datasetFieldId: undefined,
        filter: undefined,
      },
      manualEntry: {
        type: "manual_entry",
        entityFieldConfigId,
      },
      datasetColumnValue: {
        type: "dataset_column_value",
        entityFieldConfigId,
        valuePickerRuleType: "most_frequent",
        datasetId: undefined,
        datasetFieldId: undefined,
      },
    },
  };
}
