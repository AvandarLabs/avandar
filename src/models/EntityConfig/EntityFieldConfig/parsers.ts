import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { EntityConfigId } from "../types";
import { EntityFieldConfigCRUDTypes, EntityFieldConfigId } from "./types";

const DBReadSchema = z.object({
  allow_manual_edit: z.boolean(),
  base_data_type: z.enum(["string", "number", "date"]),
  class: z.enum(["dimension", "metric"]),
  created_at: z.string(),
  description: z.string().nullable(),
  entity_config_id: z.string(),
  value_extractor_type: z.enum([
    "dataset_column_value",
    "manual_entry",
    "aggregation",
  ]),
  id: z.string(),
  is_array: z.boolean().nullable(),
  is_id_field: z.boolean(),
  is_title_field: z.boolean(),
  name: z.string(),
  updated_at: z.string(),
});

const DBInsertSchema = DBReadSchema.required().partial({
  allow_manual_edit: true,
  created_at: true,
  description: true,
  id: true,
  is_array: true,
  is_id_field: true,
  is_title_field: true,
  updated_at: true,
});

const DBUpdateSchema = DBReadSchema.partial();

const DimensionReadSchema = z.object({
  allowManualEdit: DBReadSchema.shape.allow_manual_edit,
  class: z.literal("dimension"),
  baseDataType: DBReadSchema.shape.base_data_type,
  valueExtractorType: z.enum(["dataset_column_value", "manual_entry"]),
  isTitleField: DBReadSchema.shape.is_title_field,
  isIdField: DBReadSchema.shape.is_id_field,
  isArray: DBReadSchema.shape.is_array.unwrap(),
});

const MetricReadSchema = z.object({
  allowManualEdit: z.literal(false),
  class: z.literal("metric"),
  baseDataType: z.literal("number"),
  valueExtractorType: z.literal("aggregation"),
  isTitleField: z.literal(false),
  isIdField: z.literal(false),
  isArray: z.literal(false),
});

const ModelReadCoreSchema = z.object({
  id: uuidType<EntityFieldConfigId>(),
  entityConfigId: uuidType<EntityConfigId>(),
  name: DBReadSchema.shape.name,
  description: DBReadSchema.shape.description,
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelReadSchema = z.intersection(
  ModelReadCoreSchema,
  z.discriminatedUnion("class", [DimensionReadSchema, MetricReadSchema]),
);

const ModelInsertSchema = z.intersection(
  ModelReadCoreSchema.required().partial({
    id: true,
    createdAt: true,
    updatedAt: true,
    description: true,
  }),
  z.discriminatedUnion("class", [DimensionReadSchema, MetricReadSchema]),
);

const ModelUpdateSchema = z.intersection(
  ModelReadCoreSchema.partial(),
  z.union([DimensionReadSchema.partial(), MetricReadSchema.partial()]),
);

export const EntityFieldConfigParsers =
  makeParserRegistry<EntityFieldConfigCRUDTypes>({
    DBReadSchema,
    DBInsertSchema,
    DBUpdateSchema,
    ModelReadSchema,
    ModelInsertSchema,
    ModelUpdateSchema,
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = EntityFieldConfigCRUDTypes;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBInsertSchema,
      { input: CRUDTypes["DBInsert"]; output: CRUDTypes["DBInsert"] }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBUpdateSchema,
      { input: CRUDTypes["DBUpdate"]; output: CRUDTypes["DBUpdate"] }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof ModelReadSchema,
      { input: CRUDTypes["Read"]; output: CRUDTypes["Read"] }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof ModelInsertSchema,
      { input: CRUDTypes["Insert"]; output: CRUDTypes["Insert"] }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof ModelUpdateSchema,
      { input: CRUDTypes["Update"]; output: CRUDTypes["Update"] }
    >
  >,
];
