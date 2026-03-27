import { Model } from "@models/Model/Model";
import { uuid } from "$/lib/uuid";
import { DatasetColumnValueExtractor } from "$/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractor.types";
import { ManualEntryExtractor } from "$/models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractor.types";
import { EntityFieldValueExtractorRegistry } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";
import type { FormType } from "@/lib/hooks/ui/useForm";
import type { CamelCaseKeys } from "@utils/objects/camelCaseKeys/camelCaseKeys";
import type { Expect } from "@utils/types/test-utilities.types";
import type {
  Dataset,
  DatasetWithColumns,
} from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumn,
  DatasetColumnId,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type {
  EntityConfig,
  EntityConfigId,
} from "$/models/EntityConfig/EntityConfig.types";
import type {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import type { SetOptional, SetRequired } from "type-fest";

export type EntityFieldFormValues = SetRequired<
  SetOptional<EntityFieldConfig<"Insert">, "workspaceId">,
  "id"
> & {
  extractors: {
    manualEntry: SetOptional<ManualEntryExtractor<"Insert">, "workspaceId">;
    datasetColumnValue: SetOptional<
      DatasetColumnValueExtractor<"Insert">,
      "datasetId" | "datasetColumnId" | "workspaceId"
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

export type EntityConfigFormValues = SetOptional<
  SetRequired<EntityConfig<"Insert">, "id">,
  "workspaceId"
> & {
  /** The id of the field that should be used as the title field */
  titleFieldId: EntityFieldConfigId | undefined;

  /**
   * If any fields are configured as datasetColumnValue extractors,
   * this array holds the ids of the datasets we will extract from,
   * coupled with the id of the column to use as the primary key.
   */
  sourceDatasets: ReadonlyArray<{
    dataset: DatasetWithColumns;
    primaryKeyColumnId?: DatasetColumnId;
  }>;
  datasetColumnFields: readonly EntityFieldFormValues[];
  manualEntryFields: readonly EntityFieldFormValues[];
};

export type EntityConfigFormSubmitValues = EntityConfigFormValues & {
  fields: EntityFieldFormValues[];
};

export type EntityConfigFormType = FormType<
  EntityConfigFormValues,
  EntityConfigFormSubmitValues
>;

export function getDefaultEntityConfigFormValues(): EntityConfigFormValues {
  const entityConfigId: EntityConfigId = uuid();

  return Model.make("EntityConfig", {
    id: entityConfigId,
    titleFieldId: undefined,
    name: "",
    description: "",
    sourceDatasets: [],
    allowManualCreation: false,
    datasetColumnFields: [],
    manualEntryFields: [],
  });
}

export function makeDefaultDatasetColumnField({
  entityConfigId,
  name,
  dataset,
  datasetColumn,
  isIdField = false,
}: {
  entityConfigId: EntityConfigId;
  name: string;
  dataset: Dataset;
  datasetColumn: DatasetColumn;
  isIdField?: boolean;
}): EntityFieldFormValues {
  const entityFieldConfigId: EntityFieldConfigId = uuid();
  return Model.make("EntityFieldConfig", {
    id: entityFieldConfigId,
    entityConfigId,
    name,
    description: undefined,
    dataType: datasetColumn.dataType,
    valueExtractorType: "dataset_column_value",
    isIdField,
    isTitleField: false,
    allowManualEdit: false,
    isArray: false,

    // set up some default initial values for the value extractor configs
    extractors: {
      manualEntry: {
        type: "manual_entry",
        entityFieldConfigId,
      },
      datasetColumnValue: {
        type: "dataset_column_value",
        entityFieldConfigId,
        valuePickerRuleType: "most_frequent",
        datasetId: dataset.id,
        datasetColumnId: datasetColumn.id,
      },
    },
  } as const);
}

export function makeDefaultManualEntryField({
  entityConfigId,
  name,
}: {
  entityConfigId: EntityConfigId;
  name: string;
}): EntityFieldFormValues {
  const entityFieldConfigId: EntityFieldConfigId = uuid();
  return Model.make("EntityFieldConfig", {
    id: entityFieldConfigId,
    entityConfigId,
    name,
    description: undefined,
    dataType: "varchar",
    valueExtractorType: "manual_entry",
    isIdField: false,
    isTitleField: false,
    allowManualEdit: false,
    isArray: false,

    // set up some default initial values for the value extractor configs
    extractors: {
      manualEntry: {
        type: "manual_entry",
        entityFieldConfigId,
      },
      datasetColumnValue: {
        type: "dataset_column_value",
        entityFieldConfigId,
        valuePickerRuleType: "most_frequent",
        datasetId: undefined,
        datasetColumnId: undefined,
      },
    },
  } as const);
}
