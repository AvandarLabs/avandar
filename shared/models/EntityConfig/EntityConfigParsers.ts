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
import type { Workspace } from "../Workspace/Workspace.ts";
import type {
  EntityConfig,
  EntityConfigId,
  EntityConfigModel,
} from "./EntityConfig.types.ts";
import type { Expect, ZodSchemaEqualsTypes } from "@avandar/utils";
import type { UserId } from "$/models/User/User.types.ts";

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
        return Model.make("EntityConfig", {
          ...obj,
          id: obj.id as EntityConfigId,
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
