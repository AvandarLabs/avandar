import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
  ZodSchemaEqualsTypes,
} from "@avandar/utils";
import { z } from "zod";
import type { Entity, EntityId, EntityModel } from "./Entity.types.ts";
import type { Expect } from "@avandar/utils";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  assigned_to: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  entity_config_id: z.uuid(),
  external_id: z.string(),
  id: z.uuid(),
  name: z.string(),
  status: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const EntityParsers = makeParserRegistry<EntityModel>().build({
  modelName: "Entity",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): Entity => {
      return {
        ...obj,
        id: obj.id as EntityId,
        entityConfigId: obj.entityConfigId as EntityConfigId,
        workspaceId: obj.workspaceId as Workspace.Id,
      };
    },
  ),
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps("assigned_to"),
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps("assigned_to"),
  ),
});

/**
 * Do not remove these tests!
 */
type CRUDTypes = EntityModel;
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
