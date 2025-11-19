import { iso, object, uuid, enum as zodEnum } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { omitProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  excludeUndefinedDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetColumnId } from "@/models/datasets/DatasetColumn";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import {
  DatasetColumnValueExtractor,
  DatasetColumnValueExtractorId,
  DatasetColumnValueExtractorModel,
} from "./DatasetColumnValueExtractor.types";
import { DatasetColumnValueExtractors } from "./DatasetColumnValueExtractors";

const DBReadSchema = object({
  id: uuid(),
  workspace_id: uuid(),
  entity_field_config_id: uuid(),
  value_picker_rule_type: zodEnum(
    DatasetColumnValueExtractors.ValuePickerTypes,
  ),
  dataset_id: uuid(),
  dataset_column_id: uuid(),
  created_at: iso.datetime({ offset: true }),
  updated_at: iso.datetime({ offset: true }),
});

export const DatasetColumnValueExtractorParsers =
  makeParserRegistry<DatasetColumnValueExtractorModel>().build({
    modelName: "DatasetColumnValueExtractor",
    DBReadSchema,

    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DatasetColumnValueExtractor => {
        return {
          ...obj,
          type: "dataset_column_value" as const,
          id: obj.id as DatasetColumnValueExtractorId,
          workspaceId: obj.workspaceId as WorkspaceId,
          entityFieldConfigId: obj.entityFieldConfigId as EntityFieldConfigId,
          datasetId: obj.datasetId as DatasetId,
          datasetColumnId: obj.datasetColumnId as DatasetColumnId,
          valuePickerRuleType: obj.valuePickerRuleType ?? "most_frequent",
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      (input) => {
        return {
          ...input,
          // ensure there's always a default value so it doesn't error
          valuePickerRuleType: input.valuePickerRuleType ?? "most_frequent",
        };
      },
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = DatasetColumnValueExtractorModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
