import { SetOptional, SetRequired } from "type-fest";
import { uuid } from "@/lib/utils/uuid";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig, EntityConfigId } from "@/models/EntityConfig/types";
import { AggregationExtractor } from "@/models/EntityConfig/ValueExtractor/AggregationExtractor/types";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/types";
import { ManualEntryExtractor } from "@/models/EntityConfig/ValueExtractor/ManualEntryExtractor/types";

export type EntityFieldFormValues = SetRequired<
  EntityFieldConfig<"Insert">,
  "id"
> & {
  aggregationExtractor: SetOptional<
    AggregationExtractor<"Insert">,
    "datasetId" | "datasetFieldId"
  >;
  manualEntryExtractor: ManualEntryExtractor<"Insert">;
  datasetColumnValueExtractor: SetOptional<
    DatasetColumnValueExtractor<"Insert">,
    "datasetId" | "datasetFieldId"
  >;
};

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
    isIdField,
    isTitleField,
    allowManualEdit: false,
    isArray: false,
    class: "dimension",
    baseDataType: "string",
    valueExtractorType: "manual_entry",

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,

    // set up some default initial values for the value extractor configs
    aggregationExtractor: {
      entityFieldConfigId,
      aggregationType: "sum",
      datasetId: undefined,
      datasetFieldId: undefined,
      filter: null,
    },
    manualEntryExtractor: {
      entityFieldConfigId,
    },
    datasetColumnValueExtractor: {
      entityFieldConfigId,
      valuePickerRuleType: "most_frequent",
      datasetId: undefined,
      datasetFieldId: undefined,
    },
  };
}

export function getDefaultEntityConfigFormValues(): EntityConfigFormValues {
  const entityConfigId: EntityConfigId = uuid();

  return {
    id: entityConfigId,
    name: "",
    description: "",
    datasetId: null,
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
