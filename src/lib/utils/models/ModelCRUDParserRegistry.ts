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

type CRUDTransformerFunctions<M extends ModelCRUDTypes> = {
  /**
   * Takes input data through the DBReadSchema parser to validate
   * the data is a valid Read from the database. Then, puts the result through
   * the the ModelReadSchema parser. The final output is a ModelRead object.
   *
   * @param data Any data, but ideally a DBRead object that can parse
   * successfully.
   * @returns A ModelRead object if the data parsed successfully, otherwise
   * throws an error.
   */
  fromDBReadToModelRead: (data: unknown) => M["Read"];
  /**
   * Takes input data through the ModelInsertSchema parser to validate
   * the data is a valid Insert from the frontend. Then, puts the result through
   * the the DBInsertSchema parser. The final output is a DBInsert object.
   *
   * @param data Any data, but ideally a ModelInsert object that can parse
   * successfully.
   * @returns A DBInsert object if the data parsed successfully, otherwise
   * throws an error.
   */
  fromModelInsertToDBInsert: (data: unknown) => M["DBInsert"];
  /**
   * Takes input data through the ModelUpdateSchema parser to validate
   * the data is a valid Update from the frontend. Then, puts the result through
   * the the DBUpdateSchema parser. The final output is a DBUpdate object.
   *
   * @param data Any data, but ideally a ModelUpdate object that can parse
   * successfully.
   * @returns A DBUpdate object if the data parsed successfully, otherwise
   * throws an error.
   */
  fromModelUpdateToDBUpdate: (data: unknown) => M["DBUpdate"];
};

/**
 * Appends the model name and schema name to the Zod error message.
 *
 * @param modelName The name of the model.
 * @param schemaName The name of the schema.
 * @returns A custom error map for the given model and schema.
 */
function getErrorMap(modelName: string, schemaName: string): z.ZodErrorMap {
  return (_issue: z.ZodIssueOptionalMessage, ctx: z.ErrorMapCtx) => {
    return {
      message: `[${modelName}:${schemaName}] ${ctx.defaultError}`,
    };
  };
}

/**
 * A registry for the base Read schemas as well as the transformer schemas
 * that convert between database and frontend model schemas.
 */
export type ModelCRUDParserRegistry<M extends ModelCRUDTypes> =
  BaseCRUDSchemas<M> & CRUDTransformerFunctions<M>;

/**
 * Helper function to create a parser registry. It just returns
 * the passed object, but it assigns the correct generic type to it
 * which is helpful for inference in the CRUD Client code.
 *
 * The first generic defaults to `never` to force the user to explicitly
 * set the ModelCRUDTypes type.
 */
export function makeParserRegistry<M extends ModelCRUDTypes = never>(
  {
    modelName,
    DBReadSchema,
    DBInsertSchema,
    DBUpdateSchema,
    ModelReadSchema,
    ModelInsertSchema,
    ModelUpdateSchema,
  }: { modelName: M["modelName"] } & BaseCRUDSchemas<M>,
  options: {
    /**
     * Whether to switch between camel and snake_case when parsing from frontend
     * to db models
     */
    switchCasesWhenParsing: boolean;
  } = {
    switchCasesWhenParsing: true,
  },
): ModelCRUDParserRegistry<M> {
  const { switchCasesWhenParsing } = options;

  return {
    DBReadSchema,
    DBInsertSchema,
    DBUpdateSchema,
    ModelReadSchema,
    ModelInsertSchema,
    ModelUpdateSchema,
    fromDBReadToModelRead: (data: unknown) => {
      return DBReadSchema.transform((dbObj) => {
        return ModelReadSchema.parse(
          switchCasesWhenParsing ? camelCaseKeysDeep(dbObj) : dbObj,
          {
            errorMap: getErrorMap(modelName, "ModelReadSchema"),
          },
        );
      }).parse(data, {
        errorMap: getErrorMap(modelName, "DBReadSchema"),
      });
    },
    fromModelInsertToDBInsert: (data: unknown) => {
      return ModelInsertSchema.transform((modelObj) => {
        return DBInsertSchema.parse(
          switchCasesWhenParsing ? snakeCaseKeysDeep(modelObj) : modelObj,
          {
            errorMap: getErrorMap(modelName, "DBInsertSchema"),
          },
        );
      }).parse(data, {
        errorMap: getErrorMap(modelName, "ModelInsertSchema"),
      });
    },
    fromModelUpdateToDBUpdate: (data: unknown) => {
      return ModelUpdateSchema.transform((modelObj) => {
        return DBUpdateSchema.parse(
          switchCasesWhenParsing ? snakeCaseKeysDeep(modelObj) : modelObj,
          {
            errorMap: getErrorMap(modelName, "DBUpdateSchema"),
          },
        );
      }).parse(data, {
        errorMap: getErrorMap(modelName, "ModelUpdateSchema"),
      });
    },
  };
}
