import { z } from "zod";
import { UUID } from "@/lib/types/common";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { DatasetFieldId } from "@/models/DatasetField";
import { EntityFieldConfigId } from "../../EntityFieldConfig/EntityFieldConfig.types";
import {
  AdjacentFieldExtractorConfigCRUDTypes,
  AdjacentFieldExtractorConfigId,
} from "./AdjacentFieldExtractorConfig.types";

const DBReadSchema = z.object({
  id: z.string(),
  entity_field_config_id: z.string(),
  value_picker_rule_type: z.enum(["most_frequent", "first"]),
  allow_manual_edit: z.boolean(),
  dataset_id: z.string(),
  dataset_field_id: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const DBInsertSchema = DBReadSchema.partial().required({
  allow_manual_edit: true,
  value_picker_rule_type: true,
  dataset_field_id: true,
  dataset_id: true,
  entity_field_config_id: true,
});

const DBUpdateSchema = DBReadSchema.partial();

const ModelReadSchema = z.object({
  id: uuidType<AdjacentFieldExtractorConfigId>(),
  entityFieldConfigId: uuidType<EntityFieldConfigId>(),
  valuePickerRuleType: DBReadSchema.shape.value_picker_rule_type,
  allowManualEdit: DBReadSchema.shape.allow_manual_edit,
  datasetId: uuidType<UUID<"Dataset">>(),
  datasetFieldId: uuidType<DatasetFieldId>(),
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelInsertSchema = ModelReadSchema.partial().required({
  allowManualEdit: true,
  valuePickerRuleType: true,
  datasetFieldId: true,
  datasetId: true,
  entityFieldConfigId: true,
});

const ModelUpdateSchema = ModelReadSchema.partial();

export const AdjacentFieldExtractorParsers =
  makeParserRegistry<AdjacentFieldExtractorConfigCRUDTypes>({
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
type CRUDTypes = AdjacentFieldExtractorConfigCRUDTypes;
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
