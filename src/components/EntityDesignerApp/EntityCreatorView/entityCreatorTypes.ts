import { SetOptional } from "type-fest";
import { uuid } from "@/lib/utils/uuid";
import {
  DraftFieldId,
  EntityFieldConfig,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfig } from "@/models/EntityConfig/types";
import { AggregationExtractorConfig } from "@/models/EntityConfig/ValueExtractorConfig/AggregationExtractorConfig/types";
import { DatasetColumnValueExtractorConfig } from "@/models/EntityConfig/ValueExtractorConfig/DatasetColumnValueExtractorConfig/types";
import { ManualEntryExtractorConfig } from "@/models/EntityConfig/ValueExtractorConfig/ManualEntryExtractorConfig/types";

/**
 * A draft version of the type, to use while the user is still creating
 * a new EntityFieldConfig in a form.
 *
 * There is no `entityConfigId` because the user may not have created
 * the EntityConfig yet. A `draftId` must be provided in the frontend
 * so this can be used as a React key.
 */
export type EntityFieldConfigDraft = {
  draftId: DraftFieldId;
  aggregationConfig: SetOptional<
    AggregationExtractorConfig<"Insert">,
    "entityFieldConfigId" | "datasetId" | "datasetFieldId"
  >;
  manualEntryConfig: SetOptional<
    ManualEntryExtractorConfig<"Insert">,
    "entityFieldConfigId"
  >;
  datasetColumnValueConfig: SetOptional<
    DatasetColumnValueExtractorConfig<"Insert">,
    "entityFieldConfigId" | "datasetId" | "datasetFieldId"
  >;
} & Omit<EntityFieldConfig<"Insert">, "id" | "entityConfigId">;

export type EntityConfigForm = EntityConfig<"Insert"> & {
  fields: EntityFieldConfigDraft[];
};

/**
 * Make a default EntityFieldConfig Draft to use in a creation form.
 */
export function makeDefaultEntityFieldDraft({
  name,
  isIdField,
  isTitleField,
}: {
  name: string;
  isIdField: boolean;
  isTitleField: boolean;
}): EntityFieldConfigDraft {
  const dateTimeNow = new Date().toISOString();
  return {
    name,
    isIdField,
    isTitleField,
    allowManualEdit: false,
    isArray: false,
    draftId: uuid(),
    class: "dimension",
    baseDataType: "string",
    valueExtractorType: "manual_entry",
    createdAt: dateTimeNow,
    updatedAt: dateTimeNow,

    // TODO(pablo): use a null to undefined converter to avoid using `null`
    // here. We want this to be set to `undefined`
    description: null,

    // set up some default initial values for the value extractor configs
    aggregationConfig: {
      aggregationType: "sum",
      datasetId: undefined,
      datasetFieldId: undefined,
      filter: null,
      createdAt: dateTimeNow,
      updatedAt: dateTimeNow,
    },
    manualEntryConfig: {
      createdAt: dateTimeNow,
      updatedAt: dateTimeNow,
    },
    datasetColumnValueConfig: {
      valuePickerRuleType: "most_frequent",
      datasetId: undefined,
      datasetFieldId: undefined,
      createdAt: dateTimeNow,
      updatedAt: dateTimeNow,
    },
  };
}
