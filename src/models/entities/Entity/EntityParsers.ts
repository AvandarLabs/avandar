import { iso, object, string, uuid } from "zod";
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
import { EntityConfigId } from "@/models/EntityConfig/EntityConfig.types";
import { WorkspaceId } from "@/models/Workspace/types";
import { Entity, EntityId, EntityModel } from "./Entity.types";

const DBReadSchema = object({
  assigned_to: string().nullable(),
  created_at: iso.datetime({ offset: true }),
  entity_config_id: uuid(),
  external_id: string(),
  id: uuid(),
  name: string(),
  status: string(),
  updated_at: iso.datetime({ offset: true }),
  workspace_id: uuid(),
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
        workspaceId: obj.workspaceId as WorkspaceId,
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
