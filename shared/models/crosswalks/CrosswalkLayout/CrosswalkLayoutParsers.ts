import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type {
  CrosswalkLayoutId,
  CrosswalkLayoutModel,
} from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  column_names: z.array(z.string()),
  created_at: z.iso.datetime({ offset: true }),
  crosswalk_id: z.uuid(),
  id: z.uuid(),
  is_reference: z.boolean(),
  signature: z.string(),
  status: z.enum(["to_do", "review", "mapped", "skipped"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Parses `public.crosswalks__layouts` rows. Writes go through
 * `rpc_crosswalks__save`, so the insert and update transforms exist only to
 * satisfy the CRUD client.
 */
export const CrosswalkLayoutParsers =
  makeParserRegistry<CrosswalkLayoutModel>().build({
    modelName: "CrosswalkLayout",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): CrosswalkLayoutModel["Read"] => {
        return Model.make("CrosswalkLayout", {
          ...obj,
          id: obj.id as CrosswalkLayoutId,
          crosswalkId: obj.crosswalkId as CrosswalkId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = CrosswalkLayoutModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
