import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { omitProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  excludeUndefinedDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { uuid } from "@/lib/utils/uuid";
import { ManualEntryExtractor, ManualEntryExtractorModel } from "./types";

const DBReadSchema = z.object({
  id: z.string().uuid(),
  entity_field_config_id: z.string().uuid(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  workspace_id: z.string().uuid(),
});

export const ManualEntryExtractorParsers =
  makeParserRegistry<ManualEntryExtractorModel>().build({
    modelName: "ManualEntryExtractor",
    DBReadSchema,

    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): ManualEntryExtractor => {
        return {
          ...obj,
          type: "manual_entry" as const,
          id: uuid(obj.id),
          entityFieldConfigId: uuid(obj.entityFieldConfigId),
          workspaceId: uuid(obj.workspaceId),
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = ManualEntryExtractorModel;
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
