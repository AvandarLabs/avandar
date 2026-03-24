import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeNullsDeep } from "@utils/objects/excludeNullsDeep/excludeNullsDeep.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeysDeep/snakeCaseKeysDeep.ts";
import { undefinedsToNullsDeep } from "@utils/objects/undefinedsToNullsDeep/undefinedsToNullsDeep.ts";
import { z } from "zod";
import type {
  WorkspaceId,
  WorkspaceModel,
  WorkspaceRead,
} from "./Workspace.types.ts";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type { UserId } from "$/models/User/User.types.ts";

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
type CRUDTypes = WorkspaceModel;
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
