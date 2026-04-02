import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { Model } from "@models/Model/Model.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeNullsExceptInProps } from "@utils/objects/hofs/excludeNullsExceptInProps/excludeNullsExceptInProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { undefinedsToNullsDeep } from "@utils/objects/undefinedsToNullsDeep/undefinedsToNullsDeep.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DuckDBDataTypes } from "$/models/datasets/DatasetColumn/DuckDBDataTypes.ts";
import z from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  DatasetColumnId,
  DatasetColumnModel,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  original_data_type: z.string(),
  detected_data_type: z.enum(DuckDBDataTypes),
  data_type: z.enum(AvaDataType.Types),
  dataset_id: z.uuid(),
  description: z.string().nullable(),
  id: z.uuid(),
  original_name: z.string(),
  name: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
  column_idx: z.number(),
});

export const DatasetColumnParsers =
  makeParserRegistry<DatasetColumnModel>().build({
    modelName: "DatasetColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DatasetColumnModel["Read"] => {
        return Model.make("DatasetColumn", {
          ...obj,
          id: obj.id as DatasetColumnId,
          datasetId: obj.datasetId as DatasetId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("description"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("description"),
    ),
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = DatasetColumnModel;
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
