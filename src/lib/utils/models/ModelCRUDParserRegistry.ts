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
