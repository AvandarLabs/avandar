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
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityConfigId } from "@/models/EntityConfig/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { EntityId } from "../Entity/types";
import {
  EntityFieldValue,
  EntityFieldValueId,
  EntityFieldValueModel,
} from "./types";

const DBReadSchema = object({
  created_at: iso.datetime({ offset: true }),
  dataset_id: uuid().nullable(),
  entity_field_config_id: uuid(),
  entity_id: uuid(),
  entity_config_id: uuid(),
  id: uuid(),
  updated_at: iso.datetime({ offset: true }),
  value: string().nullable(),
  value_set: string(),
  workspace_id: uuid(),
});

export const EntityFieldValueParsers =
  makeParserRegistry<EntityFieldValueModel>().build({
    modelName: "EntityFieldValue",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): EntityFieldValue => {
        return {
          ...obj,
          id: obj.id as EntityFieldValueId,
          datasetId: obj.datasetId as DatasetId | undefined,
          entityFieldConfigId: obj.entityFieldConfigId as EntityFieldConfigId,
          entityId: obj.entityId as EntityId,
          entityConfigId: obj.entityConfigId as EntityConfigId,
          workspaceId: obj.workspaceId as WorkspaceId,
          valueSet: obj.valueSet.split(";"),
        };
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("dataset_id", "value"),
      (obj) => {
        return {
          ...obj,
          value_set: obj.value_set.join(";"),
        };
      },
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps("dataset_id", "value"),
      (obj) => {
        return { ...obj, value_set: obj.value_set?.join(";") };
      },
    ),
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = EntityFieldValueModel;
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
