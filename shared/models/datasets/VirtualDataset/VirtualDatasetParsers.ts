import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  VirtualDatasetId,
  VirtualDatasetModel,
} from "$/models/datasets/VirtualDataset/VirtualDataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid(),
  workspace_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  raw_sql: z.string(),
});

export const VirtualDatasetParsers =
  makeParserRegistry<VirtualDatasetModel>().build({
    modelName: "VirtualDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(camelCaseKeysDeep, (obj) => {
      const { rawSql, ...rest } = obj;
      return {
        ...rest,
        rawSQL: rawSql,
        id: obj.id as VirtualDatasetId,
        datasetId: obj.datasetId as DatasetId,
        workspaceId: obj.workspaceId as Workspace.Id,
      };
    }),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = VirtualDatasetModel;
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
