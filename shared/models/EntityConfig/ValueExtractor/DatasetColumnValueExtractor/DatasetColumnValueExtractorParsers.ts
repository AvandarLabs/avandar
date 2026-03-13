import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeysDeep/camelCaseKeysDeep.ts";
import { excludeUndefinedDeep } from "@utils/objects/excludeUndefinedDeep/excludeUndefinedDeep.ts";
import { omitProps } from "@utils/objects/hofs/omitProps/omitProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeysDeep/snakeCaseKeysDeep.ts";
import { z } from "zod";
import { DatasetColumnValueExtractors } from "./DatasetColumnValueExtractors.ts";
import type {
  DatasetColumnValueExtractor,
  DatasetColumnValueExtractorId,
  DatasetColumnValueExtractorModel,
} from "./DatasetColumnValueExtractor.types.ts";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/testUtilityTypes.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfigId } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  entity_field_config_id: z.uuid(),
  value_picker_rule_type: z.enum(DatasetColumnValueExtractors.ValuePickerTypes),
  dataset_id: z.uuid(),
  dataset_column_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
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
          workspaceId: obj.workspaceId as Workspace.Id,
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
