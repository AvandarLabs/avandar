import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { makeParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import {
  camelCaseKeysDeep,
  camelCaseKeysShallow,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects";
import {
  brandedUUIDToString,
  stringToBrandedUUID,
  uuidType,
} from "@/lib/utils/zodHelpers";
import { UserId } from "../User";
import { EntityConfigCRUDTypes, EntityConfigId } from "./EntityConfig";

const DBReadSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.string(),
  name: z.string(),
  owner_id: z.string(),
  updated_at: z.string().datetime({ offset: true }),
});

const ModelReadSchema = z
  .object(camelCaseKeysShallow(DBReadSchema.shape))
  .extend({
    id: uuidType<EntityConfigId>(),
    ownerId: uuidType<UserId>(),
  });

const fromDBToModelRead = DBReadSchema.extend({
  id: stringToBrandedUUID<EntityConfigId>(),
  owner_id: stringToBrandedUUID<UserId>(),
}).transform(camelCaseKeysDeep);

const fromModelToDBInsert = ModelReadSchema.extend({
  id: brandedUUIDToString<EntityConfigId>(),
  ownerId: brandedUUIDToString<UserId>(),
})
  .partial()
  .required({ name: true })
  .transform(snakeCaseKeysDeep);

const fromModelToDBUpdate = ModelReadSchema.extend({
  id: brandedUUIDToString<EntityConfigId>(),
  ownerId: brandedUUIDToString<UserId>(),
})
  .partial()
  .transform(snakeCaseKeysDeep);

export const EntityConfigParsers = makeParserRegistry<EntityConfigCRUDTypes>({
  DBReadSchema,
  ModelReadSchema,
  fromDBToModelRead,
  fromModelToDBInsert,
  fromModelToDBUpdate,
});

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.DBReadSchema,
      {
        input: EntityConfigCRUDTypes["DBRead"];
        output: EntityConfigCRUDTypes["DBRead"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.ModelReadSchema,
      {
        input: EntityConfigCRUDTypes["Read"];
        output: EntityConfigCRUDTypes["Read"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.fromDBToModelRead,
      {
        input: EntityConfigCRUDTypes["DBRead"];
        output: EntityConfigCRUDTypes["Read"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.fromModelToDBInsert,
      {
        input: EntityConfigCRUDTypes["Insert"];
        output: EntityConfigCRUDTypes["DBInsert"];
      }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.fromModelToDBUpdate,
      {
        input: EntityConfigCRUDTypes["Update"];
        output: EntityConfigCRUDTypes["DBUpdate"];
      }
    >
  >,
];
