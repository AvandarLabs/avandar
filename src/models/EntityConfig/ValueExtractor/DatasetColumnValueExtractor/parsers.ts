import { z } from "zod";
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
import { uuid } from "@/lib/utils/uuid";
import { asLocalDatasetId } from "@/models/LocalDataset/utils";
import {
  DatasetColumnValueExtractor,
  DatasetColumnValueExtractorModel,
} from "./types";

const DBReadSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  entity_field_config_id: z.string().uuid(),
  value_picker_rule_type: z.enum(["most_frequent", "first"]),
  dataset_id: z.string(),
  dataset_field_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
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
          id: uuid(obj.id),
          workspaceId: uuid(obj.workspaceId),
          entityFieldConfigId: uuid(obj.entityFieldConfigId),
          datasetId: asLocalDatasetId(obj.datasetId),
          datasetFieldId: uuid(obj.datasetFieldId),
          valuePickerRuleType: obj.valuePickerRuleType ?? "most_frequent",
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      (input) => {
        return {
          ...input,
          valuePickerRuleType: input.valuePickerRuleType ?? "most_frequent", // 👈 ensure it's always defined
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
