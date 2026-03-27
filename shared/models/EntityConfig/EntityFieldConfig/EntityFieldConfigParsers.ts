import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { Model } from "@models/Model/Model.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeNullsExceptInProps } from "@utils/objects/hofs/excludeNullsExceptInProps/excludeNullsExceptInProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { undefinedsToNullsDeep } from "@utils/objects/undefinedsToNullsDeep/undefinedsToNullsDeep.ts";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes.ts";
import { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types.ts";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
  EntityFieldConfigModel,
} from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import { Workspace } from "$/models/Workspace/Workspace.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";

const DBReadSchema = z.object({
  allow_manual_edit: z.boolean(),
  data_type: z.enum(AvaDataTypes.Types),
  created_at: z.string(),
  description: z.string().nullable(),
  entity_config_id: z.uuid(),
  value_extractor_type: z.enum(["dataset_column_value", "manual_entry"]),
  id: z.uuid(),
  workspace_id: z.uuid(),
  is_array: z.boolean(),
  is_id_field: z.boolean(),
  is_title_field: z.boolean(),
  name: z.string(),
  updated_at: z.string(),
});

export const EntityFieldConfigParsers =
  makeParserRegistry<EntityFieldConfigModel>().build({
    modelName: "EntityFieldConfig",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): EntityFieldConfig => {
        return Model.make("EntityFieldConfig", {
          ...obj,
          id: obj.id as EntityFieldConfigId,
          entityConfigId: obj.entityConfigId as EntityConfigId,
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
type CRUDTypes = EntityFieldConfigModel;
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
