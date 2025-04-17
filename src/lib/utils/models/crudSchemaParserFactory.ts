import {
  ZodInputOutputSchema,
  ZodSymmetricalSchema,
} from "@/lib/types/zodUtilityTypes";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

/**
 * A small registry for the base "Read" schemas to represent a database model
 * and its frontend model.
 */
export type ReadSchemasRegistry<
  M extends ModelCRUDTypes,
  DBReadSchemaType extends ZodSymmetricalSchema<M["DBRead"]>,
  ModelReadSchemaType extends ZodSymmetricalSchema<M["Read"]>,
> = {
  DBReadSchema: DBReadSchemaType;
  ModelReadSchema: ModelReadSchemaType;
};

/**
 * A registry for schemas that transform between database and frontend
 * model schemas.
 */
export type CRUDTransformerSchemaRegistry<M extends ModelCRUDTypes> = {
  fromDBToModelRead: ZodInputOutputSchema<M["DBRead"], M["Read"]>;
  fromModelToDBInsert: ZodInputOutputSchema<M["Insert"], M["DBInsert"]>;
  fromModelToDBUpdate: ZodInputOutputSchema<M["Update"], M["DBUpdate"]>;
};

/**
 * This represents the full parser registry for a model which contains
 * the base schemas for the "Read" variants (DB and frontend) as well
 * as the transformer schemas and helper functions that convert between
 * DB and frontend types to be used in Read, Insert, and Update operations.
 */
export type ModelCRUDParserRegistry<
  M extends ModelCRUDTypes,
  DBReadSchemaType extends ZodSymmetricalSchema<
    M["DBRead"]
  > = ZodSymmetricalSchema<M["DBRead"]>,
  ModelReadSchemaType extends ZodSymmetricalSchema<
    M["Read"]
  > = ZodSymmetricalSchema<M["Read"]>,
> = CRUDTransformerSchemaRegistry<M> &
  ReadSchemasRegistry<M, DBReadSchemaType, ModelReadSchemaType>;

/**
 * The type for the function that gets the transformer registry
 * that holds the schemas that converts between DB and frontend models.
 */
type MakeCRUDSchemaParserRegistry<M extends ModelCRUDTypes> = <
  DBReadSchemaType extends ZodSymmetricalSchema<M["DBRead"]>,
  ModelReadSchemaType extends ZodSymmetricalSchema<M["Read"]>,
>(options: {
  DBReadSchema: DBReadSchemaType;
  ModelReadSchema:
    | ModelReadSchemaType
    | ((dbReadSchema: DBReadSchemaType) => ModelReadSchemaType);
  getCRUDTransformers: (
    baseSchemas: ReadSchemasRegistry<M, DBReadSchemaType, ModelReadSchemaType>,
  ) => CRUDTransformerSchemaRegistry<M>;
}) => ModelCRUDParserRegistry<M, DBReadSchemaType, ModelReadSchemaType>;

/**
 * Returns an object with a `makeParserRegistry` function that, when called,
 * creates the CRUD transformer registry for a model. This registry includes
 * all schemas and helper functions for CRUD data transformations for a
 * given model type.
 * @returns A CRUD transformer registry for the model.
 */
export function crudSchemaParserFactory<M extends ModelCRUDTypes>(): {
  makeParserRegistry: MakeCRUDSchemaParserRegistry<M>;
} {
  const makeParserRegistry: MakeCRUDSchemaParserRegistry<M> = (options) => {
    const modelReadSchema =
      typeof options.ModelReadSchema === "function" ?
        options.ModelReadSchema(options.DBReadSchema)
      : options.ModelReadSchema;
    const baseReadSchemas = {
      DBReadSchema: options.DBReadSchema,
      ModelReadSchema: modelReadSchema,
    };
    const transformerSchemas = options.getCRUDTransformers(baseReadSchemas);

    return {
      ...baseReadSchemas,
      ...transformerSchemas,
    };
  };

  return {
    makeParserRegistry,
  };
}
