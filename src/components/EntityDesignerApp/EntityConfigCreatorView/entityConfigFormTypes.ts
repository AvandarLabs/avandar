import { Expect } from "$/lib/types/testUtilityTypes";
import { CamelCaseKeys } from "camelcase-keys";
import { SetOptional, SetRequired } from "type-fest";
import { FormType } from "@/lib/hooks/ui/useForm";
import { uuid } from "@/lib/utils/uuid";
import { Dataset, DatasetWithColumns } from "@/models/datasets/Dataset";
import {
  DatasetColumn,
  DatasetColumnId,
} from "@/models/datasets/DatasetColumn";
import {
  EntityConfig,
  EntityConfigId,
} from "@/models/EntityConfig/EntityConfig.types";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { DatasetColumnValueExtractor } from "@/models/EntityConfig/ValueExtractor/DatasetColumnValueExtractor/DatasetColumnValueExtractor.types";
import { ManualEntryExtractor } from "@/models/EntityConfig/ValueExtractor/ManualEntryExtractor/types";
import { EntityFieldValueExtractorRegistry } from "@/models/EntityConfig/ValueExtractor/types";
import { Models } from "@/models/Model";

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
  sourceDatasets: Array<{
    dataset: DatasetWithColumns;
    primaryKeyColumnId?: DatasetColumnId;
  }>;
  datasetColumnFields: EntityFieldFormValues[];
  manualEntryFields: EntityFieldFormValues[];
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

  return Models.make("EntityConfig", {
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
  return Models.make("EntityFieldConfig", {
    id: entityFieldConfigId,
    entityConfigId,
    name,
    description: undefined,
    dataType: datasetColumn.dataType,
    valueExtractorType: "dataset_column_value",
    isIdField,
    isTitleField: false,
    allowManualEdit: false,
    isArray: true,

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
  return Models.make("EntityFieldConfig", {
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
