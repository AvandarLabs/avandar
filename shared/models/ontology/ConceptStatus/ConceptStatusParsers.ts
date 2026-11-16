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
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type {
  ConceptStatusId,
  ConceptStatusModel,
} from "$/models/ontology/ConceptStatus/ConceptStatus.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  color: z.string(),
  concept_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.uuid(),
  name: z.string(),
  position: z.number().int(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const ConceptStatusParsers =
  makeParserRegistry<ConceptStatusModel>().build({
    modelName: "ConceptStatus",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): ConceptStatusModel["Read"] => {
        return Model.make("ConceptStatus", {
          ...obj,
          id: obj.id as ConceptStatusId,
          conceptId: obj.conceptId as ConceptId,
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
type CrudTypes = ConceptStatusModel;
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
