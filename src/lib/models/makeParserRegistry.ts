import { z } from "zod";
import { objectKeys, pick } from "../utils/objects/misc";
import { excludeUndefinedDeep } from "../utils/objects/transformations";
import { ModelCRUDTypes } from "./ModelCRUDTypes";

type GenericDBReadSchema<M extends ModelCRUDTypes> = z.ZodObject<
  z.ZodRawShape,
  "strip",
  z.ZodTypeAny,
  M["DBRead"],
  M["DBRead"]
>;

type CRUDTransformerFunctions<M extends ModelCRUDTypes> = {
  /**
   * Transforms a DBRead object into a ModelRead object.
   *
   * @param data The DBRead object to transform.
   * @returns The transformed ModelRead object.
   */
  fromDBReadToModelRead: (data: M["DBRead"]) => M["Read"];

  /**
   * Transforms a ModelInsert object into a DBInsert object.
   *
   * @param data The ModelInsert object to transform.
   * @returns The transformed DBInsert object.
   */
  fromModelInsertToDBInsert: (data: M["Insert"]) => M["DBInsert"];

  /**
   * Transforms a ModelUpdate object into a DBUpdate object.
   *
   * @param data The ModelUpdate object to transform.
   * @returns The transformed DBUpdate object.
   */
  fromModelUpdateToDBUpdate: (data: M["Update"]) => M["DBUpdate"];
};

export type ModelCRUDParserRegistry<M extends ModelCRUDTypes> = {
  DBReadSchema: GenericDBReadSchema<M>;
} & CRUDTransformerFunctions<M>;

type ParserRegistryBuilderFn<M extends ModelCRUDTypes> = (
  config: {
    modelName: M["modelName"];
    DBReadSchema: GenericDBReadSchema<M>;
  } & CRUDTransformerFunctions<M>,
) => ModelCRUDParserRegistry<M>;

/**
 * Appends the model name and schema name to the Zod error message.
 *
 * @param modelName The name of the model.
 * @param schemaName The name of the schema.
 * @returns A custom error map for the given model and schema.
 */
export function getErrorMap(
  modelName: string,
  schemaName: string,
): z.ZodErrorMap {
  return (_issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => {
    return {
      message: `[${modelName}:${schemaName}] ${ctx.defaultError}`,
    };
  };
}

/**
 * Helper function which returns a builder function for creating a parser
 * registry.
 *
 * @returns A builder function for creating a parser registry.
 */
export function makeParserRegistry<M extends ModelCRUDTypes = never>(): {
  build: ParserRegistryBuilderFn<M>;
} {
  return {
    build: (
      config: {
        modelName: M["modelName"];
        DBReadSchema: GenericDBReadSchema<M>;
      } & CRUDTransformerFunctions<M>,
    ): ModelCRUDParserRegistry<M> => {
      const dbKeys = objectKeys(config.DBReadSchema.shape);

      return {
        ...config,
        fromDBReadToModelRead: (data: M["DBRead"]) => {
          return config.fromDBReadToModelRead(
            // run the DBReadSchema parser to be extra sure we are receiving
            // a valid DBRead model
            config.DBReadSchema.parse(data, {
              errorMap: getErrorMap(config.modelName, "DBReadSchema"),
            }),
          );
        },

        fromModelInsertToDBInsert: (modelObj: M["Insert"]): M["DBInsert"] => {
          const dbObj = config.fromModelInsertToDBInsert(modelObj);

          // Only pass the keys defined in the database. Some databases
          // can reject inputs with extra keys
          const strippedDBObj = pick(dbObj, ...dbKeys);

          // the pick operation may have added some `undefined` values
          // back in, so we need to drop them
          return excludeUndefinedDeep(strippedDBObj);
        },

        fromModelUpdateToDBUpdate: (modelObj: M["Update"]): M["DBUpdate"] => {
          const dbObj = config.fromModelUpdateToDBUpdate(modelObj);

          // Only pass the keys defined in the database. Some databases
          // can reject inputs with extra keys
          const strippedDBObj = pick(dbObj, ...dbKeys);

          // the pick operation may have added some `undefined` values
          // back in, so we need to drop them
          return excludeUndefinedDeep(strippedDBObj);
        },
      };
    },
  };
}
