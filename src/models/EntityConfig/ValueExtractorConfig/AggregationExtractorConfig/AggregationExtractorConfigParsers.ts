import { z } from "zod";
import { UUID } from "@/lib/types/common";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { jsonType, uuidType } from "@/lib/utils/zodHelpers";
import { DatasetFieldId } from "@/models/DatasetField";
import { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import {
  AggregationExtractorConfigCRUDTypes,
  AggregationExtractorConfigId,
} from "./AggregationExtractorConfig.types";

const DBReadSchema = z.object({
  id: z.string(),
  entity_field_config_id: z.string(),
  aggregation_type: z.enum(["sum", "max", "count"]),
  dataset_id: z.string(),
  dataset_field_id: z.string(),
  filter: jsonType().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const DBInsertSchema = DBReadSchema.required().partial({
  id: true,
  created_at: true,
  updated_at: true,
  filter: true,
});

const DBUpdateSchema = DBReadSchema.partial();

const ModelReadSchema = z.object({
  id: uuidType<AggregationExtractorConfigId>(),
  entityFieldConfigId: uuidType<EntityFieldConfigId>(),
  aggregationType: DBReadSchema.shape.aggregation_type,
  datasetId: uuidType<UUID<"Dataset">>(),
  datasetFieldId: uuidType<DatasetFieldId>(),
  filter: DBReadSchema.shape.filter,
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelInsertSchema = ModelReadSchema.required().partial({
  id: true,
  createdAt: true,
  updatedAt: true,
  filter: true,
});

const ModelUpdateSchema = ModelReadSchema.partial();

export const AggregationExtractorConfigParsers =
  makeParserRegistry<AggregationExtractorConfigCRUDTypes>({
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
type CRUDTypes = AggregationExtractorConfigCRUDTypes;
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
