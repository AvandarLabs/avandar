import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { excludeNullsExceptInProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { uuid } from "@/lib/utils/uuid";
import { EntityConfig, EntityConfigModel } from "./types";

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

export const EntityConfigParsers =
  makeParserRegistry<EntityConfigModel>().build({
    modelName: "EntityConfig",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): EntityConfig => {
        return {
          ...obj,
          id: uuid(obj.id),
          ownerId: uuid(obj.ownerId),
          workspaceId: uuid(obj.workspaceId),
        };
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
type CRUDTypes = EntityConfigModel;
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
