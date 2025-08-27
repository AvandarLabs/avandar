import { ILogger } from "../Logger";
import { ModelCRUDParserRegistry } from "../models/makeParserRegistry";
import { ModelCRUDTypes } from "../models/ModelCRUDTypes";
import { EmptyObject } from "../types/common";
import { AnyFunctionWithSignature } from "../types/utilityTypes";
import { FiltersByColumn } from "../utils/filters/filtersByColumn";
import { objectKeys, omit } from "../utils/objects/misc";
import { BaseClient, createBaseClient } from "./BaseClient";
import { WithLogger, withLogger } from "./withLogger";
import { HookableFnName, WithQueryHooks } from "./withQueryHooks/types";
import { withQueryHooks } from "./withQueryHooks/withQueryHooks";

export type ModelCRUDPage<ModelRead> = {
  /** The rows in the page */
  rows: ModelRead[];

  /**
   * The total number of rows in the data store (for the query that
   * generated this page)
   */
  totalRows: number;

  /**
   * The total number of pages in the data store (for the query that
   * generated this page)
   */
  totalPages: number;

  /** The next page number, or undefined if there is no next page */
  nextPage: number | undefined;

  /** The previous page number, or undefined if there is no previous page */
  prevPage: number | undefined;
};

/**
 * A base generic client for a model with CRUD operations.
 * This interface does not make any assumptions of what the backing data store
 * of the model is.
 *
 * All of these functions will have auto-generated `useQuery` and `useMutation`
 * hooks.
 */
export type BaseModelCRUDClient<M extends ModelCRUDTypes> = {
  /** The parsers for the model */
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * Retrieves a single model instance by its ID.
   * @param params - The parameters for the operation
   * @param params.id - The unique identifier of the model to retrieve.
   * If the `id` is nullish, the function will return undefined.
   * This is helpful to support `useQuery` hooks that may not have an id
   * yet on the first render.
   * @returns A promise resolving to the model instance or undefined
   * if not found
   */
  getById(params: {
    id: M["modelPrimaryKeyType"] | null | undefined;
  }): Promise<M["Read"] | undefined>;

  /**
   * Retrieves the total number of instances of a model.
   *
   * A `null` result on a successful query means there was no error
   * but the count could not be computed for some reason.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply.
   * @returns A promise resolving to the total number of instances
   */
  getCount(params: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<number | null>;

  /**
   * Retrieves one page of instances of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. Get all instances that pass the
   * filters.
   * @param params.pageSize The number of instances to return per page.
   * @param params.pageNum The page number to return.
   *
   * @returns A promise resolving to a page of model instances
   */
  getPage(params: {
    where?: FiltersByColumn<M["DBRead"]>;
    pageSize: number;
    pageNum: number;
  }): Promise<ModelCRUDPage<M["Read"]>>;

  /**
   * Retrieves all instances of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. Get all instances that pass the
   * filters.
   *
   * @returns A promise resolving to an array of model instances
   */
  getAll(params?: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<Array<M["Read"]>>;

  /**
   * Retrieves a single instance of a model.
   *
   * @param params Optional params for the query
   * @param params.where Filters to apply. If multiple instances pass the
   * filter, the first instance is returned.
   *
   * @returns A promise resolving to the model instance or undefined
   * if not found. If multiple instances pass the `where` filter, only
   * the first instance is returned.
   */
  getOne(params: {
    where?: FiltersByColumn<M["DBRead"]>;
  }): Promise<M["Read"] | undefined>;

  /**
   * Creates a new model instance in the data store.
   * @param data - The data to insert for the new model instance
   * @returns A promise resolving to the created model instance
   */
  insert(params: { data: M["Insert"] }): Promise<M["Read"]>;

  /**
   * Inserts multiple new model instances in the data store.
   * @param params - The parameters for the operation
   * @param params.data - An array of data objects to insert.
   * @returns A promise resolving to an array of the created model instances
   */
  bulkInsert(params: {
    data: ReadonlyArray<M["Insert"]>;
  }): Promise<Array<M["Read"]>>;

  /**
   * Updates an existing model instance with the provided data.
   * @param id - The unique identifier of the model to update
   * @param data - The data to update on the model instance
   * @returns A promise resolving to the updated model instance
   */
  update(params: {
    id: M["modelPrimaryKeyType"];
    data: M["Update"];
  }): Promise<M["Read"]>;

  /**
   * Deletes a model instance from the data store.
   * @param id - The unique identifier of the model to delete
   * @returns A promise that resolves when deletion is complete
   */
  delete(params: { id: M["modelPrimaryKeyType"] }): Promise<void>;

  /**
   * Deletes multiple model instances from the data store.
   * @param params
   * @param params.ids - An array of IDs of the models to delete
   * @returns A void promise.
   */
  bulkDelete(params: {
    ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
  }): Promise<void>;
} & BaseClient;

/**
 * A client with only functions that have a single parameter and
 * that return a Promise.
 */
export type HookableClient = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnyFunctionWithSignature<[any], Promise<unknown>>
>;

export type ModelCRUDClient<
  // These args should be passed explicitly
  M extends ModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient = EmptyObject,
  ExtendedMutationsClient extends HookableClient = EmptyObject,
  FullClient extends BaseModelCRUDClient<ModelCRUDTypes> &
    ExtendedQueriesClient &
    ExtendedMutationsClient = BaseModelCRUDClient<M> &
    ExtendedQueriesClient &
    ExtendedMutationsClient,
> = WithLogger<
  WithQueryHooks<
    FullClient,
    Exclude<
      HookableFnName<FullClient>,
      DefaultMutationFnName | HookableFnName<ExtendedMutationsClient>
    >,
    Exclude<
      HookableFnName<FullClient>,
      DefaultQueryFnName | HookableFnName<ExtendedQueriesClient>
    >
  >
>;

type CreateModelCRUDClientOptions<
  M extends ModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
> = {
  modelName: M["modelName"];

  /** The default batch size to use in `getAll`. Defaults to 500. */
  defaultGetAllBatchSize?: number;
  parsers: ModelCRUDParserRegistry<M>;

  /**
   * Additional queries to merge into the main client. These will also have
   * auto-generated `useQuery` hooks.
   */
  additionalQueries?: (config: {
    clientLogger: ILogger;
  }) => ExtendedQueriesClient;

  /**
   * Additional mutations to merge into the main client. These will also have
   * auto-generated `useMutation` hooks.
   */
  additionalMutations?: (config: {
    clientLogger: ILogger;
  }) => ExtendedMutationsClient;

  // `Get` queries
  getById: (params: {
    id: M["modelPrimaryKeyType"] | null | undefined;
    logger: ILogger;
  }) => Promise<M["DBRead"] | undefined>;
  getCount: (params: {
    where?: FiltersByColumn<M["DBRead"]>;
    logger: ILogger;
  }) => Promise<number | null>;
  getPage: (params: {
    where?: FiltersByColumn<M["DBRead"]>;
    pageSize: number;
    pageNum: number;
    logger: ILogger;
  }) => Promise<Array<M["DBRead"]>>;

  // Mutations
  insert: (params: {
    data: M["DBInsert"];
    logger: ILogger;
  }) => Promise<M["DBRead"]>;
  bulkInsert: (params: {
    data: ReadonlyArray<M["DBInsert"]>;
    logger: ILogger;
  }) => Promise<Array<M["DBRead"]>>;
  update: (params: {
    id: M["modelPrimaryKeyType"];
    data: M["DBUpdate"];
    logger: ILogger;
  }) => Promise<M["DBRead"]>;
  delete: (params: {
    id: M["modelPrimaryKeyType"];
    logger: ILogger;
  }) => Promise<void>;
  bulkDelete: (params: {
    ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
    logger: ILogger;
  }) => Promise<void>;
};

export function createModelCRUDClient<
  M extends ModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient = EmptyObject,
  ExtendedMutationsClient extends HookableClient = EmptyObject,
>({
  modelName,
  defaultGetAllBatchSize = 500,
  parsers,
  additionalQueries,
  additionalMutations,
  ...crudFns
}: CreateModelCRUDClientOptions<
  M,
  ExtendedQueriesClient,
  ExtendedMutationsClient
>): ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const baseClient = createBaseClient(modelName);

  const _getPage = async (params: {
    where: FiltersByColumn<M["DBRead"]> | undefined;
    pageSize: number;
    pageNum: number;
    logger: ILogger;
    totalRows: number | undefined;
  }): Promise<ModelCRUDPage<M["Read"]>> => {
    const { pageNum, pageSize, logger } = params;

    logger.log("Calling `getPage` with params", omit(params, "logger"));
    const pageRows = await crudFns.getPage(params);

    logger.log(
      `Received ${modelName} DBRead page[${pageNum}] from database. Row count: ${pageRows.length}`,
    );

    // Now let's figure out our page metadata to return
    let totalRows = params.totalRows;
    if (totalRows === undefined) {
      if (pageNum === 0 && pageRows.length < pageSize) {
        // if we're on the first page and the number of rows we received
        // is less than the requested `pageSize`, then we can be 100% sure
        // that we have all the rows. So there's no need to send a separate
        // `getCount` query
        totalRows = pageRows.length;
      } else {
        totalRows =
          (await crudFns.getCount({
            where: params.where,
            logger,
          })) ?? 0;
      }
    }

    // special case for when there's 0 rows, we still say there is 1 page
    const totalPages = totalRows === 0 ? 1 : Math.ceil(totalRows / pageSize);
    const nextPage = pageNum + 1 === totalPages ? undefined : pageNum + 1;
    const prevPage = pageNum === 0 ? undefined : pageNum - 1;

    // Finally, parse the db rows into models
    const pageModels = pageRows.map((row) => {
      return parsers.fromDBReadToModelRead(row);
    });
    logger.log(
      `Parsed page [${pageNum}] of ${modelName}Read (count: ${pageRows.length})`,
    );

    return {
      rows: pageModels,
      nextPage,
      prevPage,
      totalRows,
      totalPages,
    };
  };

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const additionalQueriesRecord =
      additionalQueries?.({ clientLogger: baseLogger }) ?? {};
    const additionalMutationsRecord =
      additionalMutations?.({ clientLogger: baseLogger }) ?? {};

    const modelClient = {
      ...baseClient,
      getById: async (params: {
        id: M["modelPrimaryKeyType"] | null | undefined;
      }): Promise<M["Read"] | undefined> => {
        const logger = baseLogger.appendName("getById");

        logger.log("Calling `getById` with params", params);
        const dbRow = await crudFns.getById({
          id: params.id,
          logger,
        });

        logger.log(`Received ${modelName} DBRead`, dbRow);
        if (!dbRow) {
          return undefined;
        }
        const model = parsers.fromDBReadToModelRead(dbRow);

        logger.log(`Parsed ${modelName}Read`, model);
        return model;
      },

      getCount: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
        } = {},
      ): Promise<number | null> => {
        const logger = baseLogger.appendName("getCount");

        logger.log("Calling `getCount` with params", params);
        const count = await crudFns.getCount({
          where: params.where,
          logger,
        });

        logger.log(`${modelName} count`, count);
        return count;
      },

      getPage: async (params: {
        where?: FiltersByColumn<M["DBRead"]>;
        pageSize: number;
        pageNum: number;
      }): Promise<ModelCRUDPage<M["Read"]>> => {
        const logger = baseLogger.appendName("getPage");
        const { where, pageNum = 0, pageSize } = params;
        const page = await _getPage({
          pageNum,
          pageSize,
          where,
          logger,
          totalRows: undefined,
        });
        return page;
      },

      getAll: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
          batchSize?: number;
        } = {},
      ): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("getAll");

        logger.log("Calling `getAll` with params", params);
        const { where, batchSize = defaultGetAllBatchSize } = params;
        const firstPage = await _getPage({
          where,
          pageSize: batchSize,
          pageNum: 0,
          logger,
          totalRows: undefined,
        });

        // Now iterate through the pages until we get the last one. We keep
        // accumulating all rows into `allRows.
        let nextPage = firstPage.nextPage;
        const allRows = firstPage.rows;
        while (nextPage !== undefined) {
          const newPage = await _getPage({
            where,
            pageSize: batchSize,
            pageNum: nextPage,
            totalRows: firstPage.totalRows,
            logger,
          });
          allRows.push(...newPage.rows);
          nextPage = newPage.nextPage;
        }

        logger.log(`Received all ${modelName}Read (count: ${allRows.length})`);
        return allRows;
      },

      getOne: async (
        params: {
          where?: FiltersByColumn<M["DBRead"]>;
        } = {},
      ): Promise<M["Read"] | undefined> => {
        const logger = baseLogger.appendName("getOne");

        logger.log("Calling `getOne` with params", params);
        const page = await _getPage({
          where: params.where,
          pageSize: 1,
          pageNum: 0,
          logger,
          totalRows: 1,
        });

        const model = page.rows[0];
        logger.log(`Received ${modelName} Read`, model);
        return model;
      },

      insert: async (params: { data: M["Insert"] }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("insert");

        logger.log("Calling `insert` with params", params);
        const dbDataToInsert = parsers.fromModelInsertToDBInsert(params.data);

        logger.log(`Sending ${modelName} DBInsert to database`, dbDataToInsert);
        const insertedData = await crudFns.insert({
          data: dbDataToInsert,
          logger,
        });

        logger.log(`Received ${modelName} DBRead`, insertedData);
        const insertedModel = parsers.fromDBReadToModelRead(insertedData);

        logger.log(`Parsed ${modelName}Read`, insertedModel);
        return insertedModel;
      },

      bulkInsert: async (params: {
        data: ReadonlyArray<M["Insert"]>;
      }): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("bulkInsert");

        logger.log("Calling `bulkInsert` with params", params);
        const dbDataToInsert = params.data.map(
          parsers.fromModelInsertToDBInsert,
        );

        logger.log(
          `Sending ${modelName} DBInsert list to database`,
          dbDataToInsert,
        );
        const insertedData = await crudFns.bulkInsert({
          data: dbDataToInsert,
          logger,
        });

        logger.log(`Received ${modelName} DBRead list`, insertedData);
        const insertedModels = insertedData.map(parsers.fromDBReadToModelRead);

        logger.log(
          `Parsed ${modelName}Read list (count: ${insertedModels.length})`,
        );
        return insertedModels;
      },

      update: async (params: {
        id: M["modelPrimaryKeyType"];
        data: M["Update"];
      }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("update");
        logger.log("Calling `update` with params", params);
        const dbDataToUpdate = parsers.fromModelUpdateToDBUpdate(params.data);

        logger.log(`Sending ${modelName} DBUpdate to database`, dbDataToUpdate);
        const updatedData = await crudFns.update({
          id: params.id,
          data: dbDataToUpdate,
          logger,
        });

        logger.log(`Received ${modelName} DBRead`, updatedData);
        const updatedModel = parsers.fromDBReadToModelRead(updatedData);

        logger.log(`Parsed ${modelName}Read`, updatedModel);
        return updatedModel;
      },

      delete: async (params: {
        id: M["modelPrimaryKeyType"];
      }): Promise<void> => {
        const logger = baseLogger.appendName("delete");
        logger.log("Calling `delete` with params", params);
        await crudFns.delete({
          id: params.id,
          logger,
        });
        logger.log("Finished `delete`");
      },

      bulkDelete: async (params: {
        ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      }): Promise<void> => {
        const logger = baseLogger.appendName("bulkDelete");
        logger.log("Calling `bulkDelete` with params", params);
        await crudFns.bulkDelete({
          ids: params.ids,
          logger,
        });
        logger.log("Finished `bulkDelete`");
      },

      ...additionalQueriesRecord,
      ...additionalMutationsRecord,
    };

    const additionalQueryNames = objectKeys(additionalQueriesRecord);
    const additionalMutationNames = objectKeys(additionalMutationsRecord);

    // Now attach the `use` hooks to our clients
    const modelClientWithHooks = withQueryHooks(modelClient, {
      queryFns: [...DEFAULT_QUERY_FN_NAMES, ...additionalQueryNames],
      mutationFns: [...DEFAULT_MUTATION_FN_NAMES, ...additionalMutationNames],
    });

    return {
      ...baseClient,
      ...modelClientWithHooks,
      parsers,

      // Using `any` here only because TypeScript is struggling with the
      // complexity of the generics and function name extractions.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}

/**
 * A default list of query functions to turn into `use` hooks in a CRUD client.
 * They will wrap `useQuery`.
 */
export const DEFAULT_QUERY_FN_NAMES = [
  "getById",
  "getPage",
  "getAll",
  "getOne",
  "getCount",
] as const satisfies ReadonlyArray<
  HookableFnName<BaseModelCRUDClient<ModelCRUDTypes>>
>;
export type DefaultQueryFnName = (typeof DEFAULT_QUERY_FN_NAMES)[number];

/**
 * A default list of mutation functions to turn into `use` hooks in a CRUD
 * client. They will wrap `useMutation`.
 */
export const DEFAULT_MUTATION_FN_NAMES = [
  "insert",
  "bulkInsert",
  "update",
  "delete",
  "bulkDelete",
] as const satisfies ReadonlyArray<
  HookableFnName<BaseModelCRUDClient<ModelCRUDTypes>>
>;

export type DefaultMutationFnName = (typeof DEFAULT_MUTATION_FN_NAMES)[number];
