import { match } from "ts-pattern";
import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { isOneOf } from "@/lib/utils/guards";
import {
  camelCaseKeysDeep,
  excludeNullsExceptIn,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { uuid } from "@/lib/utils/uuid";
import { WorkspaceId } from "@/models/Workspace/types";
import { EntityConfigId } from "../types";
import {
  DimensionRead,
  EntityFieldConfig,
  EntityFieldConfigId,
  EntityFieldConfigModel,
  MetricRead,
} from "./types";

const DBReadSchema = z.object({
  allow_manual_edit: z.boolean(),
  base_data_type: z.enum(["string", "number", "date"]),
  class: z.enum(["dimension", "metric"]),
  created_at: z.string(),
  description: z.string().nullable(),
  entity_config_id: z.string().uuid(),
  value_extractor_type: z.enum([
    "dataset_column_value",
    "manual_entry",
    "aggregation",
  ]),
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  is_array: z.boolean().nullable(),
  is_id_field: z.boolean(),
  is_title_field: z.boolean(),
  name: z.string(),
  updated_at: z.string(),
});

function fromDBReadToModelRead(
  dbObj: EntityFieldConfig<"DBRead">,
): EntityFieldConfig<"Read"> {
  const newObj = nullsToUndefinedDeep(camelCaseKeysDeep(dbObj));
  const coreField = {
    id: uuid<EntityFieldConfigId>(newObj.id),
    entityConfigId: uuid<EntityConfigId>(newObj.entityConfigId),
    workspaceId: uuid<WorkspaceId>(newObj.workspaceId),
    description: newObj.description,
    name: newObj.name,
    createdAt: newObj.createdAt,
    updatedAt: newObj.updatedAt,
  };

  // parse the database model to create the discriminated union
  // `options` object
  const options: DimensionRead | MetricRead = match(newObj)
    .with({ class: "dimension" }, (dimensionField) => {
      if (
        isOneOf(dimensionField.baseDataType, ["string", "number", "date"]) &&
        isOneOf(dimensionField.valueExtractorType, [
          "dataset_column_value",
          "manual_entry",
        ])
      ) {
        return {
          class: "dimension",
          baseDataType: dimensionField.baseDataType,
          valueExtractorType: dimensionField.valueExtractorType,
          isTitleField: dimensionField.isTitleField,
          isIdField: dimensionField.isIdField,
          allowManualEdit: dimensionField.allowManualEdit,
          isArray: dimensionField.isArray ?? false,
        } as const;
      } else {
        console.error(
          "Invalid Dimension field config received from DB",
          newObj,
        );
        throw new Error("Invalid Dimension field config received from DB");
      }
    })
    .with({ class: "metric" }, (metricField) => {
      if (
        metricField.baseDataType === "number" &&
        metricField.valueExtractorType === "aggregation"
      ) {
        return {
          class: "metric",
          baseDataType: metricField.baseDataType,
          valueExtractorType: metricField.valueExtractorType,
          isTitleField: false,
          isIdField: false,
          allowManualEdit: false,
          isArray: false,
        } as const;
      } else {
        console.error("Invalid Metric field config received from DB", newObj);
        throw new Error("Invalid Metric field config received from DB");
      }
    })
    .exhaustive();

  return { ...coreField, options };
}

export const EntityFieldConfigParsers =
  makeParserRegistry<EntityFieldConfigModel>().build({
    modelName: "EntityFieldConfig",
    DBReadSchema,
    fromDBReadToModelRead,

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      (obj): EntityFieldConfig<"DBInsert"> => {
        const { options, ...field } = excludeNullsExceptIn(obj, "description");

        // put the options back in the flattened db object
        const newOptions = excludeNullsExceptIn(options, "is_array");
        return { ...field, ...newOptions };
      },
    ),

    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      (obj): EntityFieldConfig<"DBUpdate"> => {
        const { options, ...field } = excludeNullsExceptIn(obj, [
          "description",
        ]);
        // put the options back in the flattened db object
        const newOptions = excludeNullsExceptIn(options, "is_array");
        return { ...field, ...newOptions };
      },
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
