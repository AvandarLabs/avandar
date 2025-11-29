import { Expect, ZodSchemaEqualsTypes } from "$/lib/types/testUtilityTypes";
import z, { boolean, object, string, uuid, enum as zodEnum } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { excludeNullsExceptInProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { AvaDataTypes } from "@/models/datasets/AvaDataType";
import { Models } from "@/models/Model";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { EntityConfigId } from "../EntityConfig.types";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
  EntityFieldConfigModel,
} from "./EntityFieldConfig.types";

const DBReadSchema = object({
  allow_manual_edit: boolean(),
  data_type: zodEnum(AvaDataTypes.Types),
  created_at: string(),
  description: string().nullable(),
  entity_config_id: uuid(),
  value_extractor_type: z.enum(["dataset_column_value", "manual_entry"]),
  id: uuid(),
  workspace_id: uuid(),
  is_array: boolean(),
  is_id_field: boolean(),
  is_title_field: boolean(),
  name: string(),
  updated_at: string(),
});

export const EntityFieldConfigParsers =
  makeParserRegistry<EntityFieldConfigModel>().build({
    modelName: "EntityFieldConfig",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): EntityFieldConfig => {
        return Models.make("EntityFieldConfig", {
          ...obj,
          id: obj.id as EntityFieldConfigId,
          entityConfigId: obj.entityConfigId as EntityConfigId,
          workspaceId: obj.workspaceId as WorkspaceId,
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
