import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { uuid } from "@/lib/utils/uuid";
import { UserId } from "../User/types";
import { Workspace, WorkspaceId, WorkspaceModel } from "./types";

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
    (obj): Workspace => {
      return {
        ...obj,
        id: uuid<WorkspaceId>(obj.id),
        ownerId: uuid<UserId>(obj.ownerId),
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
