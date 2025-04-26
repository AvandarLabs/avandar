import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { mimeType, uuidType } from "@/lib/utils/zodHelpers";
import { LocalDatasetFieldSchema } from "./LocalDatasetField/parsers";
import { LocalDatasetCRUDTypes, LocalDatasetId } from "./types";

/**
 * Zod schema for the local dataset type.
 */
export const DBReadSchema = z.object({
  id: uuidType<LocalDatasetId>(),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sizeInBytes: z.number(),
  mimeType,
  data: z.string(),
  delimiter: z.string(),
  firstRowIsHeader: z.boolean(),
  fields: z.array(LocalDatasetFieldSchema).readonly(),
});
const DBInsertSchema = DBReadSchema;
const DBUpdateSchema = DBReadSchema.partial();

const ModelReadSchema = DBReadSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});
const ModelInsertSchema = ModelReadSchema;
const ModelUpdateSchema = ModelReadSchema.partial();

export const LocalDatasetParsers = makeParserRegistry<LocalDatasetCRUDTypes>({
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
type CRUDTypes = LocalDatasetCRUDTypes;
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
