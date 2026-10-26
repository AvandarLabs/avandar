import { makeParserRegistry } from "@avandar/clients";
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
import type { ConceptStatusId } from "$/models/ontology/ConceptStatus/ConceptStatus.types.ts";
import type {
  IndividualId,
  IndividualModel,
} from "$/models/ontology/Individual/Individual.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  assigned_to: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  concept_id: z.uuid(),
  external_id: z.string(),
  id: z.uuid(),
  missing_from_source_at: z.iso.datetime({ offset: true }).nullable(),
  name: z.string(),
  status_id: z.uuid(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const IndividualParsers = makeParserRegistry<IndividualModel>().build({
  modelName: "Individual",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): IndividualModel["Read"] => {
      return {
        ...obj,
        id: obj.id as IndividualId,
        statusId: obj.statusId as ConceptStatusId,
        conceptId: obj.conceptId as ConceptId,
        workspaceId: obj.workspaceId as Workspace.Id,
      };
    },
  ),
  // The generated insert type requires `status_id`, but a database trigger
  // fills it from the case type's default when an insert names none.
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["assigned_to", "missing_from_source_at"]),
    (row) => {
      return row as IndividualModel["DBInsert"];
    },
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["assigned_to", "missing_from_source_at"]),
  ),
});

/**
 * Do not remove these tests!
 */
type CrudTypes = IndividualModel;
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
