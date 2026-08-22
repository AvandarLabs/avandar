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
import type {
  ConceptId,
  ConceptModel,
} from "$/models/ontology/Concept/Concept.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.string().uuid(),
  name: z.string(),
  owner_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  updated_at: z.string().datetime({ offset: true }),
  allow_manual_creation: z.boolean(),
});

export const ConceptParsers = makeParserRegistry<ConceptModel>().build({
  modelName: "Concept",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): ConceptModel["Read"] => {
      return Model.make("Concept", {
        ...obj,
        id: obj.id as ConceptId,
        ownerId: obj.ownerId as UserId,
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
type CrudTypes = ConceptModel;
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
