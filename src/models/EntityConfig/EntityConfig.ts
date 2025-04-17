import { CamelCasedPropertiesDeep, Merge, SetRequired } from "type-fest";
import { z } from "zod";
import { crudSchemaParserFactory } from "@/lib/utils/models/crudSchemaParserFactory";
import { SupabaseCRUDModelVariants } from "@/lib/utils/models/SupabaseCRUDModelVariants";
import {
  camelCaseKeysDeep,
  camelCaseKeysShallow,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects";
import {
  stringToBrandedUUID,
  unimplementedType,
  uuidType,
} from "@/lib/utils/zodHelpers";
import { UserId } from "@/models/User";
import type { UUID } from "@/lib/types/common";

export type EntityConfigId = UUID<"EntityConfig">;

export interface EntityConfigCRUDTypes
  extends SupabaseCRUDModelVariants<"entity_configs"> {
  dbTablePrimaryKey: "id";
  modelPrimaryKey: "id";
  Read: Merge<
    CamelCasedPropertiesDeep<EntityConfigCRUDTypes["DBRead"]>,
    {
      id: EntityConfigId;
      ownerId: UserId;
    }
  >;
  Insert: SetRequired<Partial<EntityConfigCRUDTypes["Read"]>, "name">;
  Update: Partial<EntityConfigCRUDTypes["Read"]>;
}

export type EntityConfig<K extends keyof EntityConfigCRUDTypes = "Read"> =
  EntityConfigCRUDTypes[K];

export const EntityConfigParsers =
  crudSchemaParserFactory<EntityConfigCRUDTypes>().makeParserRegistry({
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
    getCRUDTransformers: ({ DBReadSchema, ModelReadSchema }) => {
      return {
        fromDBToModelRead: DBReadSchema.extend({
          id: stringToBrandedUUID<EntityConfigId>(),
          owner_id: stringToBrandedUUID<UserId>(),
        }).transform(camelCaseKeysDeep),
        fromModelToDBInsert: ModelReadSchema.partial()
          .required()
          .transform(snakeCaseKeysDeep),
        fromModelToDBUpdate: unimplementedType(),
      };
    },
  });
