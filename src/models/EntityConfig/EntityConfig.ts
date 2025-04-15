import { CamelCasedPropertiesDeep, Merge, SetRequired } from "type-fest";
import { z } from "zod";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/utilityTypes";
import { parserFactory } from "@/lib/utils/models/parserFactory";
import {
  camelCaseKeysDeep,
  camelCaseKeysShallow,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects";
import { stringToBrandedUUID, uuidType } from "@/lib/utils/zodHelpers";
import { UserId } from "@/models/User";
import type { UUID } from "@/lib/types/common";
import type { Tables, TablesInsert } from "@/types/database.types";

export type EntityConfigId = UUID<"EntityConfig">;

export type EntityConfigCRUDTypes = {
  DBRead: Tables<"entity_configs">;
  DBInsert: TablesInsert<"entity_configs">;
  Read: Merge<
    CamelCasedPropertiesDeep<EntityConfigCRUDTypes["DBRead"]>,
    {
      id: EntityConfigId;
      ownerId: UserId;
    }
  >;
  Insert: SetRequired<Partial<EntityConfigCRUDTypes["Read"]>, "name">;
};

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  EntityConfigCRUDTypes[K];

export const EntityConfigParsers =
  parserFactory<EntityConfigCRUDTypes>().makeParserRegistry({
    DBReadSchema: z.object({
      created_at: z.string().datetime(),
      description: z.string().nullable(),
      id: z.string(),
      name: z.string(),
      owner_id: z.string(),
      updated_at: z.string().datetime(),
    }),
    ModelReadSchema: (dbReadSchema) => {
      return z.object(camelCaseKeysShallow(dbReadSchema.shape)).extend({
        id: uuidType<EntityConfigId>(),
        ownerId: uuidType<UserId>(),
      });
    },
    makeParsers: ({ DBReadSchema, ModelReadSchema }) => {
      return {
        fromDBToModelRead: DBReadSchema.extend({
          id: stringToBrandedUUID<EntityConfigId>(),
          owner_id: stringToBrandedUUID<UserId>(),
        }).transform(camelCaseKeysDeep),
        fromModelToDBInsert: ModelReadSchema.partial()
          .required()
          .transform(snakeCaseKeysDeep),
      };
    },
  });

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Ignore the fact we never reference `TypeTests`
type TypeTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.DBReadSchema,
      { input: EntityConfig<"DBRead">; output: EntityConfig<"DBRead"> }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.ModelReadSchema,
      { input: EntityConfig<"Read">; output: EntityConfig<"Read"> }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.fromDBToModelRead,
      { input: EntityConfig<"DBRead">; output: EntityConfig<"Read"> }
    >
  >,
  Expect<
    ZodSchemaEqualsTypes<
      typeof EntityConfigParsers.fromModelToDBInsert,
      { input: EntityConfig<"Insert">; output: EntityConfig<"DBInsert"> }
    >
  >,
];
