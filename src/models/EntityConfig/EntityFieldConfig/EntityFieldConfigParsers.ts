import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { camelCaseKeysDeep, snakeCaseKeysDeep } from "@/lib/utils/objects";
import {
  jsonType,
  stringToBrandedUUID,
  uuidType,
} from "@/lib/utils/zodHelpers";
import { DatasetFieldId } from "@/models/DatasetField";
import { EntityConfigId } from "../EntityConfig";
import {
  EntityFieldConfigCRUDTypes,
  EntityFieldConfigId,
} from "./EntityFieldConfig";

const DBReadSchema = z.object({
  allow_manual_edit: z.boolean().nullable(),
  base_type: z.string(),
  class: z.string(),
  created_at: z.string().datetime({ offset: true }),
  description: z.string().nullable(),
  entity_config_id: z.string(),
  id: z.string(),
  is_array: z.boolean().nullable(),
  is_id_field: z.boolean(),
  is_title_field: z.boolean(),
  name: z.string(),
  updated_at: z.string().datetime({ offset: true }),
  value_extractor: jsonType(),
});

const DimensionExtractorSchemas = {
  adjacentField: z.object({
    extractorType: z.literal("adjacentField"),
    valuePickerRule: z.enum(["mostFrequent", "first"]),
    allowManualEdit: z.boolean(),
    datasetId: z.number(),
    datasetFieldId: uuidType<DatasetFieldId>(),
  }),
  manualEntry: z.object({
    extractorType: z.literal("manualEntry"),
    allowManualEdit: z.literal(true),
  }),
};

const DimensionReadSchema = z.object({
  class: z.literal("dimension"),
  baseType: z.enum(["string", "number", "date"]),
  isArray: z.boolean(),
  isTitleField: z.boolean(),
  isIdField: z.boolean(),
  valueExtractor: z.discriminatedUnion("extractorType", [
    DimensionExtractorSchemas.adjacentField,
    DimensionExtractorSchemas.manualEntry,
  ]),
});

const MetricReadSchema = z.object({
  class: z.literal("metric"),
  baseType: z.literal("number"),
  isTitleField: z.literal(false),
  isIdField: z.literal(false),
  valueExtractor: z.object({
    extractorType: z.literal("aggregation"),
    aggregation: z.enum(["sum", "max", "count"]),
    datasetId: z.number(),
    datasetFieldId: uuidType<DatasetFieldId>(),
    filter: z.unknown(),
  }),
});

const ModelReadCoreSchema = z.object({
  id: uuidType<EntityFieldConfigId>(),
  entityConfigId: uuidType<EntityConfigId>(),
  name: DBReadSchema.shape.name.describe("This is a name"),
  description: DBReadSchema.shape.description,
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelReadSchema = z.intersection(
  ModelReadCoreSchema,
  z.discriminatedUnion("class", [DimensionReadSchema, MetricReadSchema]),
);

const ModelInsertSchema = z.intersection(
  ModelReadCoreSchema.partial().required({
    entityConfigId: true,
    name: true,
  }),
  z.discriminatedUnion("class", [
    DimensionReadSchema.partial().required({
      baseType: true,
      class: true,
      valueExtractor: true,
    }),
    MetricReadSchema.partial().required({
      baseType: true,
      class: true,
      valueExtractor: true,
    }),
  ]),
);

const DBInsertSchema = DBReadSchema.partial({
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
const ModelUpdateSchema = z.intersection(
  ModelReadCoreSchema.partial(),
  z.union([DimensionReadSchema.partial(), MetricReadSchema.partial()]),
);

const fromDBToModelRead = DBReadSchema.extend({
  id: stringToBrandedUUID<EntityFieldConfigId>(),
  entity_config_id: stringToBrandedUUID<EntityConfigId>(),
}).transform((values) => {
  const camelCasedObject = camelCaseKeysDeep(values);
  return ModelReadSchema.parse(camelCasedObject);
});

const fromModelToDBInsert = ModelInsertSchema.transform((values) => {
  const snakeCasedObject = snakeCaseKeysDeep(values);
  return DBInsertSchema.parse(snakeCasedObject);
});

const fromModelToDBUpdate = ModelUpdateSchema.transform((values) => {
  const snakeCasedObject = snakeCaseKeysDeep(values);
  return DBUpdateSchema.parse(snakeCasedObject);
});

export const EntityFieldConfigParsers = {
  DBReadSchema,
  ModelReadSchema,
  fromDBToModelRead,
  fromModelToDBInsert,
  fromModelToDBUpdate,
} satisfies ModelCRUDParserRegistry<EntityFieldConfigCRUDTypes>;

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityFieldConfigParsers.DBReadSchema,
      {
        input: EntityFieldConfigCRUDTypes["DBRead"];
        output: EntityFieldConfigCRUDTypes["DBRead"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityFieldConfigParsers.ModelReadSchema,
      {
        input: EntityFieldConfigCRUDTypes["Read"];
        output: EntityFieldConfigCRUDTypes["Read"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityFieldConfigParsers.fromDBToModelRead,
      {
        input: EntityFieldConfigCRUDTypes["DBRead"];
        output: EntityFieldConfigCRUDTypes["Read"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityFieldConfigParsers.fromModelToDBInsert,
      {
        input: EntityFieldConfigCRUDTypes["Insert"];
        output: EntityFieldConfigCRUDTypes["DBInsert"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityFieldConfigParsers.fromModelToDBUpdate,
      {
        input: EntityFieldConfigCRUDTypes["Update"];
        output: EntityFieldConfigCRUDTypes["DBUpdate"];
      }
    >
  >,
];
