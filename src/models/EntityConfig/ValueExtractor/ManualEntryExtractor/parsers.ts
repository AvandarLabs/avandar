import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { uuidType } from "@/lib/utils/zodHelpers";
import { EntityFieldConfigId } from "../../EntityFieldConfig/types";
import { ManualEntryExtractorCRUDTypes, ManualEntryExtractorId } from "./types";

const DBReadSchema = z.object({
  id: z.string(),
  entity_field_config_id: z.string(),
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
  id: uuidType<ManualEntryExtractorId>(),
  entityFieldConfigId: uuidType<EntityFieldConfigId>(),
  createdAt: DBReadSchema.shape.created_at,
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelInsertSchema = ModelReadSchema.required().partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const ModelUpdateSchema = ModelReadSchema.partial();

export const ManualEntryExtractorParsers =
  makeParserRegistry<ManualEntryExtractorCRUDTypes>({
    modelName: "ManualEntryExtractor",
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
type CRUDTypes = ManualEntryExtractorCRUDTypes;
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
