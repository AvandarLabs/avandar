import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { uuidType } from "@/lib/utils/zodHelpers";
import { UserId } from "../User";
import { EntityConfigCRUDTypes, EntityConfigId } from "./EntityConfig.types";

const DBReadSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.string(),
  name: z.string(),
  owner_id: z.string(),
  updated_at: z.string().datetime({ offset: true }),
});

const DBInsertSchema = DBReadSchema.required().partial({
  created_at: true,
  description: true,
  id: true,
  owner_id: true,
  updated_at: true,
});

const DBUpdateSchema = DBReadSchema.partial();

const ModelReadSchema = z.object({
  createdAt: DBReadSchema.shape.created_at,
  description: DBReadSchema.shape.description,
  id: uuidType<EntityConfigId>(),
  name: DBReadSchema.shape.name,
  ownerId: uuidType<UserId>(),
  updatedAt: DBReadSchema.shape.updated_at,
});

const ModelInsertSchema = ModelReadSchema.required().partial({
  createdAt: true,
  description: true,
  id: true,
  ownerId: true,
  updatedAt: true,
});

const ModelUpdateSchema = ModelReadSchema.partial();

export const EntityConfigParsers = makeParserRegistry<EntityConfigCRUDTypes>({
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
type CRUDTypes = EntityConfigCRUDTypes;
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
