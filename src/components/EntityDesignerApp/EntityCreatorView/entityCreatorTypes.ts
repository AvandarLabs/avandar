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
  fields: EntityFieldFormValues[];
};

/**
 * Make a default EntityFieldConfig form values to use in a creation form.
 */
export function getDefaultEntityFieldFormValues({
  entityConfigId,
  name,
  isIdField,
  isTitleField,
}: {
  entityConfigId: EntityConfigId;
  name: string;
  isIdField: boolean;
  isTitleField: boolean;
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
      isIdField,
      isTitleField,
      allowManualEdit: false,
      isArray: false,
    },

    extractors: {
      // set up some default initial values for the value extractor configs
      aggregation: {
        type: "aggregation",
        entityFieldConfigId,
        aggregationType: "sum",
        datasetId: undefined,
        datasetFieldId: undefined,
        filter: null,
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

export function getDefaultEntityConfigFormValues(): EntityConfigFormValues {
  const entityConfigId: EntityConfigId = uuid();

  return {
    id: entityConfigId,
    name: "",
    description: "",
    datasetId: undefined,
    allowManualCreation: false,
    fields: [
      getDefaultEntityFieldFormValues({
        entityConfigId,
        isIdField: true,
        isTitleField: true,
        name: "Name",
      }),
    ],
  };
}
