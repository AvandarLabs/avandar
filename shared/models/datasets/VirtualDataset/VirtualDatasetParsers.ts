import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { Model } from "@models/Model/Model.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
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
import type { ChatPlan } from "$/types/chat.types.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  dataset_id: z.uuid(),
  workspace_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  raw_sql: z.string(),
  plan_steps: supabaseJSONSchema.nullable(),
});

export const VirtualDatasetParsers =
  makeParserRegistry<VirtualDatasetModel>().build({
    modelName: "VirtualDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      ({ rawSql, planSteps, ...obj }) => {
        return Model.make("VirtualDataset", {
          ...obj,
          rawSql: rawSql,
          planSteps: (planSteps ?? null) as ChatPlan | null,
          id: obj.id as VirtualDatasetId,
          datasetId: obj.datasetId as DatasetId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: (model) => {
      const { planSteps, ...rest } = model;
      const snake = snakeCaseKeysDeep(rest);
      return planSteps === undefined ? snake : (
          { ...snake, plan_steps: planSteps }
        );
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { planSteps, ...rest } = model;
      const snake = snakeCaseKeysDeep(rest);
      return planSteps === undefined ? snake : (
          { ...snake, plan_steps: planSteps }
        );
    },
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = VirtualDatasetModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
