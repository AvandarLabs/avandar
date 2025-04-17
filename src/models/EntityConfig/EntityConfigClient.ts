import { z } from "zod";
import { SupabaseCRUDClient } from "@/lib/clients/SupabaseCRUDClient";
import { withQueryHooks } from "@/lib/clients/withQueryHooks";
import { modelCRUDSchemaParserFactory } from "@/lib/utils/models/modelCRUDSchemaParserFactory";
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
import { UserId } from "../User";
import { EntityConfigCRUDTypes, EntityConfigId } from "./EntityConfig";

class EntityConfigClientImpl extends SupabaseCRUDClient<
  "entity_configs",
  EntityConfigCRUDTypes
> {}

const EntityConfigParsers =
  modelCRUDSchemaParserFactory<EntityConfigCRUDTypes>().makeParserRegistry({
    DBReadSchema: z.object({
      created_at: z.string().datetime({ offset: true }),
      description: z.string().nullable(),
      id: z.string(),
      name: z.string(),
      owner_id: z.string(),
      updated_at: z.string().datetime({ offset: true }),
    }),
    ModelReadSchema: (dbReadSchema) => {
      return z.object(camelCaseKeysShallow(dbReadSchema.shape)).extend({
        id: uuidType<EntityConfigId>(),
        ownerId: uuidType<UserId>(),
      });
    },
    transformers: ({ DBReadSchema, ModelReadSchema }) => {
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

export const EntityConfigClient = withQueryHooks(
  new EntityConfigClientImpl({
    modelName: "EntityConfig",
    tableName: "entity_configs",
    dbTablePrimaryKey: "id",
    parserRegistry: EntityConfigParsers,
  }),
);

console.log("new client", EntityConfigClient);
