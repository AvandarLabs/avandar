import { z } from "zod";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

/**
 * A registry for the base Read schemas as well as the transformer schemas
 * that convert between database and frontend model schemas.
 */
export type ModelCRUDParserRegistry<M extends ModelCRUDTypes> = {
  DBReadSchema: z.ZodType<M["DBRead"]>;
  ModelReadSchema: z.ZodType<M["Read"]>;
  fromDBToModelRead: z.ZodType<M["Read"], z.ZodTypeDef, M["DBRead"]>;
  fromModelToDBInsert: z.ZodType<M["DBInsert"], z.ZodTypeDef, M["Insert"]>;
  fromModelToDBUpdate: z.ZodType<M["DBUpdate"], z.ZodTypeDef, M["Update"]>;
};

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
  ModelReadSchema,
  fromDBToModelRead,
  fromModelToDBInsert,
  fromModelToDBUpdate,
}: ModelCRUDParserRegistry<M>): ModelCRUDParserRegistry<M> {
  return {
    DBReadSchema,
    ModelReadSchema,
    fromDBToModelRead,
    fromModelToDBInsert,
    fromModelToDBUpdate,
  };
}
