import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type {
  CrosswalkColumnId,
  CrosswalkColumnModel,
} from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.types.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  crosswalk_id: z.uuid(),
  data_type: z.enum(AvaDataType.Types),
  entry_id: z.uuid().nullable(),
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Parses `public.crosswalks__columns` rows. Writes go through
 * `rpc_crosswalks__save`, so the insert and update transforms exist only to
 * satisfy the CRUD client.
 */
export const CrosswalkColumnParsers =
  makeParserRegistry<CrosswalkColumnModel>().build({
    modelName: "CrosswalkColumn",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): CrosswalkColumnModel["Read"] => {
        return Model.make("CrosswalkColumn", {
          ...obj,
          id: obj.id as CrosswalkColumnId,
          crosswalkId: obj.crosswalkId as CrosswalkId,
          entryId: obj.entryId as DataDictionaryEntry.Id | undefined,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("entry_id"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("entry_id"),
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = CrosswalkColumnModel;
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
