import { z } from "zod";
import { UUID } from "@/lib/types/common";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { DatasetFieldId } from "@/models/DatasetField";
import { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import {
  DatasetColumnValueExtractorConfigCRUDTypes,
  DatasetColumnValueExtractorConfigId,
} from "./types";

const DBReadSchema = z.object({
  id: z.string(),
  entity_field_config_id: z.string(),
  value_picker_rule_type: z.enum(["most_frequent", "first"]),
  dataset_id: z.string(),
  dataset_field_id: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const DBInsertSchema = DBReadSchema.required().partial({
  id: true,
  created_at: true,
  updated_at: true,
});

const DBUpdateSchema = DBReadSchema.partial();

const ModelReadSchema = z.object({
  id: uuidType<DatasetColumnValueExtractorConfigId>(),
  entityFieldConfigId: uuidType<EntityFieldConfigId>(),
  valuePickerRuleType: DBReadSchema.shape.value_picker_rule_type,
  datasetId: uuidType<UUID<"Dataset">>(),
  datasetFieldId: uuidType<DatasetFieldId>(),
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelInsertSchema = ModelReadSchema.required().partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const ModelUpdateSchema = ModelReadSchema.partial();

export const DatasetColumnValueExtractorConfigParsers =
  makeParserRegistry<DatasetColumnValueExtractorConfigCRUDTypes>({
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
type CRUDTypes = DatasetColumnValueExtractorConfigCRUDTypes;
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
