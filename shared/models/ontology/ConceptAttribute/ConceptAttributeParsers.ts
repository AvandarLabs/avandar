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
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import {
  ConceptAttributeId,
  ConceptAttributeModel,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import { Workspace } from "$/models/Workspace/Workspace.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  allow_manual_edit: z.boolean(),
  data_type: z.enum(AvaDataType.Types),
  created_at: z.string(),
  description: z.string().nullable(),
  concept_id: z.uuid(),
  mapping_type: z.enum(["dataset_column", "manual_entry"]),
  id: z.uuid(),
  workspace_id: z.uuid(),
  is_array: z.boolean(),
  is_identifier: z.boolean(),
  is_label: z.boolean(),
  name: z.string(),
  updated_at: z.string(),
});

export const ConceptAttributeParsers =
  makeParserRegistry<ConceptAttributeModel>().build({
    modelName: "ConceptAttribute",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): ConceptAttributeModel["Read"] => {
        return Model.make("ConceptAttribute", {
          ...obj,
          id: obj.id as ConceptAttributeId,
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
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CrudTypes = ConceptAttributeModel;
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
