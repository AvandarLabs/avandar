import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import { camelCaseKeysDeep, pipe, snakeCaseKeysDeep } from "@avandar/utils";
import { z } from "zod";
import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type {
  CrosswalkDatasetId,
  CrosswalkDatasetModel,
} from "$/models/crosswalks/CrosswalkDataset/CrosswalkDataset.types.ts";
import type { CrosswalkLayoutId } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  crosswalk_id: z.uuid(),
  dataset_id: z.uuid(),
  id: z.uuid(),
  layout_id: z.uuid(),
  workspace_id: z.uuid(),
});

/**
 * Parses `public.crosswalks__datasets` rows. Writes go through
 * `rpc_crosswalks__save`, so the insert and update transforms exist only to
 * satisfy the CRUD client.
 */
export const CrosswalkDatasetParsers =
  makeParserRegistry<CrosswalkDatasetModel>().build({
    modelName: "CrosswalkDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      (obj): CrosswalkDatasetModel["Read"] => {
        return Model.make("CrosswalkDataset", {
          ...obj,
          id: obj.id as CrosswalkDatasetId,
          crosswalkId: obj.crosswalkId as CrosswalkId,
          datasetId: obj.datasetId as Dataset.Id,
          layoutId: obj.layoutId as CrosswalkLayoutId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = CrosswalkDatasetModel;
// oxlint-disable-next-line typescript/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
