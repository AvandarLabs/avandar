import { z } from "zod";
import { camelCaseKeysDeep, snakeCaseKeysDeep } from "../objects";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

type BaseCRUDSchemas<M extends ModelCRUDTypes> = {
  DBReadSchema: z.ZodType<M["DBRead"]>;
  DBInsertSchema: z.ZodType<M["DBInsert"]>;
  DBUpdateSchema: z.ZodType<M["DBUpdate"]>;
  ModelReadSchema: z.ZodType<M["Read"]>;
  ModelInsertSchema: z.ZodType<M["Insert"]>;
  ModelUpdateSchema: z.ZodType<M["Update"]>;
};

type TransformerCRUDSchemas<M extends ModelCRUDTypes> = {
  fromDBToModelRead: z.ZodType<M["Read"], z.ZodTypeDef, M["DBRead"]>;
  fromModelInsertToDBInsert: z.ZodType<
    M["DBInsert"],
    z.ZodTypeDef,
    M["Insert"]
  >;
  fromModelUpdateToDBUpdate: z.ZodType<
    M["DBUpdate"],
    z.ZodTypeDef,
    M["Update"]
  >;
};

/**
 * A registry for the base Read schemas as well as the transformer schemas
 * that convert between database and frontend model schemas.
 */
export type ModelCRUDParserRegistry<M extends ModelCRUDTypes> =
  BaseCRUDSchemas<M> & TransformerCRUDSchemas<M>;

/**
 * Helper function to create a parser registry. It just returns
 * the passed object, but it assigns the correct generic type to it
 * which is helpful for inference in the CRUD Client code.
 *
 * The first generic defaults to `never` to force the user to explicitly
 * set the ModelCRUDTypes type.
 */
export function makeParserRegistry<M extends ModelCRUDTypes = never>({
  DBReadSchema,
  DBInsertSchema,
  DBUpdateSchema,
  ModelReadSchema,
  ModelInsertSchema,
  ModelUpdateSchema,
  fromDBToModelRead = undefined,
  fromModelInsertToDBInsert = undefined,
  fromModelUpdateToDBUpdate = undefined,
}: BaseCRUDSchemas<M> &
  Partial<TransformerCRUDSchemas<M>>): ModelCRUDParserRegistry<M> {
  return {
    DBReadSchema,
    DBInsertSchema,
    DBUpdateSchema,
    ModelReadSchema,
    ModelInsertSchema,
    ModelUpdateSchema,
    fromDBToModelRead:
      fromDBToModelRead ??
      DBReadSchema.transform((dbObj) => {
        return ModelReadSchema.parse(camelCaseKeysDeep(dbObj));
      }),
    fromModelInsertToDBInsert:
      fromModelInsertToDBInsert ??
      ModelInsertSchema.transform((modelObj) => {
        return DBInsertSchema.parse(snakeCaseKeysDeep(modelObj));
      }),
    fromModelUpdateToDBUpdate:
      fromModelUpdateToDBUpdate ??
      ModelUpdateSchema.transform((modelObj) => {
        return DBUpdateSchema.parse(snakeCaseKeysDeep(modelObj));
      }),
  };
}
