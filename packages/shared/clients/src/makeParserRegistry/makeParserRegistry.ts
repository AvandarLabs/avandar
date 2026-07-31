import { excludeUndefinedDeep } from "@utils/objects/excludeUndefinedDeep/excludeUndefinedDeep.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { pick } from "@utils/objects/pick/pick.ts";
import type { CrudModelSpec } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type { z } from "zod";

type ObjectDBReadSchema<M extends CrudModelSpec> = z.ZodObject<{
  [K in keyof M["DBRead"]]: z.ZodType<M["DBRead"][K], M["DBRead"][K]>;
}>;

type GenericDBReadSchema<M extends CrudModelSpec> = z.ZodType<
  M["DBRead"],
  M["DBRead"]
>;

type KeysOfUnion<T> = T extends T ? keyof T : never;

type DBReadKey<M extends CrudModelSpec> = Extract<
  KeysOfUnion<M["DBRead"]>,
  string
>;

type CrudTransformerFunctions<M extends CrudModelSpec> = {
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

export type ModelCrudParserRegistry<M extends CrudModelSpec> = {
  DBReadSchema: GenericDBReadSchema<M>;
} & CrudTransformerFunctions<M>;

type ParserRegistrySchemaConfig<M extends CrudModelSpec> =
  | {
      DBReadSchema: ObjectDBReadSchema<M>;
      dbKeys?: ReadonlyArray<DBReadKey<M>>;
    }
  | {
      DBReadSchema: GenericDBReadSchema<M>;
      /**
       * Database keys retained when a non-object schema parses a model union.
       *
       * Object schemas derive these keys from their Zod shape automatically.
       */
      dbKeys: ReadonlyArray<DBReadKey<M>>;
    };

type ParserRegistryBuilderFn<M extends CrudModelSpec> = (
  config: {
    modelName: M["modelName"];
  } & ParserRegistrySchemaConfig<M> &
    CrudTransformerFunctions<M>,
) => ModelCrudParserRegistry<M>;

/**
 * Appends the model name and schema name to the Zod error message.
 *
 * @param modelName The name of the model.
 * @param schemaName The name of the schema.
 * @returns A custom error map for the given model and schema.
 */
export function getErrorMap({
  modelName,
  schemaName,
}: {
  modelName: string;
  schemaName: string;
}): z.ZodErrorMap {
  return (issue) => {
    return {
      message:
        issue.message ?
          `[${modelName}:${schemaName}] (${issue.code}) ${issue.message}`
        : `[${modelName}:${schemaName}] (${issue.code})Error parsing schema.`,
    };
  };
}

/**
 * Helper function which returns a builder function for creating a parser
 * registry.
 *
 * @returns A builder function for creating a parser registry.
 */
export function makeParserRegistry<M extends CrudModelSpec = never>(): {
  build: ParserRegistryBuilderFn<M>;
} {
  return {
    build: (
      config: {
        modelName: M["modelName"];
      } & ParserRegistrySchemaConfig<M> &
        CrudTransformerFunctions<M>,
    ): ModelCrudParserRegistry<M> => {
      const dbKeys: ReadonlyArray<DBReadKey<M>> =
        config.dbKeys ??
        (objectKeys(
          (config.DBReadSchema as ObjectDBReadSchema<M>).shape,
        ) as unknown as Array<DBReadKey<M>>);

      return {
        ...config,
        fromDBReadToModelRead: (data: M["DBRead"]) => {
          return config.fromDBReadToModelRead(
            // run the DBReadSchema parser to be extra sure we are receiving
            // a valid DBRead model
            config.DBReadSchema.parse(data, {
              error: getErrorMap({
                modelName: config.modelName,
                schemaName: "DBReadSchema",
              }),
            }),
          );
        },

        fromModelInsertToDBInsert: (modelObj: M["Insert"]): M["DBInsert"] => {
          const dbObj = config.fromModelInsertToDBInsert(modelObj);

          // Only pass the keys defined in the database. Some databases
          // can reject inputs with extra keys
          const strippedDBObj = pick(dbObj, dbKeys);

          // the pick operation may have added some `undefined` values
          // back in, so we need to drop them
          return excludeUndefinedDeep(strippedDBObj) as M["DBInsert"];
        },

        fromModelUpdateToDBUpdate: (modelObj: M["Update"]): M["DBUpdate"] => {
          const dbObj = config.fromModelUpdateToDBUpdate(modelObj);

          // Only pass the keys defined in the database. Some databases
          // can reject inputs with extra keys
          const strippedDBObj = pick(dbObj, dbKeys);

          // the pick operation may have added some `undefined` values
          // back in, so we need to drop them
          return excludeUndefinedDeep(strippedDBObj) as M["DBUpdate"];
        },
      };
    },
  };
}
