import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type {
  WorkspaceId,
  WorkspaceRead,
} from "$/models/Workspace/Workspace.types.ts";
import type { SetOptional } from "type-fest";

export type WorkspaceModel = SupabaseCrudModelSpec<
  {
    tableName: "workspaces";
    modelName: "Workspace";
    modelPrimaryKeyType: WorkspaceId;
    modelTypes: {
      Read: WorkspaceRead;
      Insert: SetOptional<WorkspaceRead, "id" | "createdAt" | "updatedAt">;
      Update: Partial<WorkspaceRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  owner_id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
});

export const WorkspaceParsers = makeParserRegistry<WorkspaceModel>().build({
  modelName: "Workspace",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): WorkspaceRead => {
      return {
        ...obj,
        id: obj.id as WorkspaceId,
        ownerId: obj.ownerId as UserId,
      };
    },
  ),

  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsDeep,
  ),

  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsDeep,
  ),
});

/**
 * Do not remove these tests!
 */
type CrudTypes = WorkspaceModel;
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
