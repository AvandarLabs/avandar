import { match } from "ts-pattern";
import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ILogger } from "../Logger";
import { ModelCRUDParserRegistry } from "../models/makeParserRegistry";
import { SupabaseModelCRUDTypes } from "../models/SupabaseModelCRUDTypes";
import { AnyFunctionWithSignature } from "../types/utilityTypes";
import { FiltersByColumn } from "../utils/filters/filtersByColumn";
import { FilterOperator } from "../utils/filters/filterTypes";
import { objectEntries, objectKeys, omit } from "../utils/objects/misc";
import { BaseClient } from "./BaseClient";
import {
  DEFAULT_MUTATION_FN_NAMES,
  DEFAULT_QUERY_FN_NAMES,
  DefaultMutationFnName,
  DefaultQueryFnName,
  ModelCRUDClient,
} from "./ModelCRUDClient";
import { WithLogger, withLogger } from "./withLogger";
import {
  HookableFnName,
  WithQueryHooks,
  withQueryHooks,
} from "./withQueryHooks";

export type SupabaseCRUDClient<
  Client extends ModelCRUDClient<SupabaseModelCRUDTypes>,
  ExtendedQueriesClient extends BaseClient,
  ExtendedMutationsClient extends BaseClient,
> = WithLogger<
  WithQueryHooks<
    Client,
    Extract<HookableFnName<Client>, DefaultQueryFnName>,
    Extract<HookableFnName<Client>, DefaultMutationFnName>
  > &
    WithQueryHooks<
      ExtendedQueriesClient,
      HookableFnName<ExtendedQueriesClient>,
      never
    > &
    WithQueryHooks<
      ExtendedMutationsClient,
      never,
      HookableFnName<ExtendedMutationsClient>
    >
>;

/**
 * A client with only functions that have a single parameter and
 * that return a Promise.
 */
type HookableClient = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AnyFunctionWithSignature<[any], Promise<unknown>>
>;

/**
 * Creates a client for a model that maps to a Supabase table.
 *
 * It also creates `use` hooks for the `DEFAULT_QUERY_FN_NAMES` and
 * `DEFAULT_MUTATION_FN_NAMES`.
 */
export function createSupabaseCRUDClient<
  M extends SupabaseModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
>({
  modelName,
  tableName,
  parsers,
  dbTablePrimaryKey,
  queries: buildQueriesClient,
  mutations: buildMutationsClient,
}: {
  modelName: M["modelName"];
  tableName: M["tableName"];

  /**
   * A registry of parsers for converting between model variants and
   * database variants.
   */
  parsers: ModelCRUDParserRegistry<M>;
  dbTablePrimaryKey: M["dbTablePrimaryKey"];

  /**
   * Additional query functions to add to the client. These functions
   * will get wrapped in `useQuery` hooks.
   * @param config
   * @param config.logger - A logger for the client.
   * @returns An object of additional mutation functions. Each function must
   * return a promise.
   */
  queries?: (config: { clientLogger: ILogger }) => ExtendedQueriesClient;

  /**
   * Additional mutation functions to add to the client. These functions
   * will get wrapped in `useMutation` hooks.
   * @param config
   * @param config.logger - A logger for the client.
   * @returns An object of additional mutation functions. Each function must
   * return a promise.
   */
  mutations?: (config: { clientLogger: ILogger }) => ExtendedMutationsClient;
}): SupabaseCRUDClient<
  ModelCRUDClient<M>,
  ExtendedQueriesClient & BaseClient,
  ExtendedMutationsClient & BaseClient
> {
  const baseClient: BaseClient = {
    getClientName() {
      return `${modelName}Client`;
    },
  };

  return withLogger(baseClient, (baseLogger: ILogger) => {
    const modelClient: ModelCRUDClient<M> = {
      ...baseClient,

      /**
       * Retrieves a model by its ID.
       * @param params
       * @param params.id - The ID of the model to retrieve
       * @returns A promise that resolves to the model, or undefined if not
       * found.
       */
      getById: async (params: {
        id: M["modelPrimaryKeyType"] | null | undefined;
      }): Promise<M["Read"] | undefined> => {
        if (params.id === undefined || params.id === null) {
          return undefined;
        }

        const { data } = await SupabaseDBClient.from(tableName)
          .select("*")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .maybeSingle<M["DBRead"]>()
          .throwOnError();

        if (!data) {
          return undefined;
        }

        const model = parsers.fromDBReadToModelRead(data);
        return model;
      },

      /**
       * Retrieves all models from the database.
       *
       * TODO(pablo): implement pagination
       * @returns A promise that resolves to an array of models
       */
      getAll: async (params?: {
        where: FiltersByColumn<M["DBRead"]>;
      }): Promise<Array<M["Read"]>> => {
        baseLogger.warn("TODO(pablo): Pagination must be implemented.");
        const logger = baseLogger.appendName("getAll");

        let query = SupabaseDBClient.from(tableName).select("*");

        if (params?.where) {
          objectKeys(params.where).forEach((column) => {
            const filter = params.where[column as keyof M["DBRead"]];
            if (filter) {
              objectEntries(filter).forEach(([operator, value]) => {
                // currently we only support `eq` filters
                match(operator as FilterOperator)
                  .with("eq", () => {
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    query = query.eq(String(column), value as any);
                  })
                  .with("in", () => {
                    // eslint-disable-next-line max-len
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    query = query.in(String(column), value as any);
                  })
                  .exhaustive();
              });
            }
          });
        }

        const { data } = await query
          .overrideTypes<Array<M["DBRead"]>, { merge: false }>()
          .throwOnError();

        logger.log("Received data from Supabase", data);

        const models = data.map((dbRow) => {
          const model = parsers.fromDBReadToModelRead(dbRow);
          return model;
        });

        logger.log("Parsed model data", data);

        return models;
      },

      /**
       * Inserts a new model into the database.
       * @param params
       * @param params.data - The model to insert
       * @returns The inserted model
       */
      insert: async (params: { data: M["Insert"] }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("insert");

        logger.log("Attempting to insert with arguments", params.data);

        const dataToInsert = parsers.fromModelInsertToDBInsert(params.data);

        logger.log("Sending formatted data to Supabase", dataToInsert);

        const { data: insertedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dataToInsert as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();

        logger.log("Received data from Supabase", insertedData);

        const insertedModel = parsers.fromDBReadToModelRead(insertedData);
        return insertedModel;
      },

      /**
       * Inserts multiple new models into the database.
       * @param params
       * @param params.data - An array of models to insert
       * @returns An array of the inserted models
       */
      bulkInsert: async (params: {
        data: ReadonlyArray<M["Insert"]>;
      }): Promise<Array<M["Read"]>> => {
        const logger = baseLogger.appendName("bulkInsert");

        logger.log("Attempting to insert with arguments", params.data);

        const dataToInsert = params.data.map(parsers.fromModelInsertToDBInsert);

        logger.log("Sending formatted data to Supabase", dataToInsert);

        const { data: insertedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dataToInsert as any)
          .select()
          .overrideTypes<Array<M["DBRead"]>, { merge: false }>()
          .throwOnError();

        logger.log("Received data from Supabase", insertedData);

        const insertedModels = insertedData.map((dbRow) => {
          const model = parsers.fromDBReadToModelRead(dbRow);
          return model;
        });

        return insertedModels;
      },

      /**
       * Updates an existing model in the database.
       * @param params
       * @param params.id - The ID of the model to update
       * @param params.data - The data to update on the model
       * @returns The updated model
       */
      update: async (params: {
        id: M["modelPrimaryKeyType"];
        data: M["Update"];
      }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("update");
        logger.log("Attempting to update with arguments", params);

        const dataToUpdate = parsers.fromModelUpdateToDBUpdate(params.data);

        logger.log("Sending formatted data to Supabase", dataToUpdate);

        const { data: updatedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(dataToUpdate as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();

        logger.log("Received data from Supabase", updatedData);

        return parsers.fromDBReadToModelRead(updatedData);
      },

      /**
       * Deletes an existing model from the database.
       * @param params
       * @param params.id - The ID of the model to delete
       * @returns A void promise.
       */
      delete: async (params: {
        id: M["modelPrimaryKeyType"];
      }): Promise<void> => {
        const logger = baseLogger.appendName("delete");
        logger.log("Attempting to delete", params.id);
        await SupabaseDBClient.from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .throwOnError();
        logger.log("Finished `delete`");
      },

      /**
       * Deletes multiple existing models from the database.
       * @param params
       * @param params.ids - An array of IDs of the models to delete
       * @returns A void promise.
       */
      bulkDelete: async (params: {
        ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
      }): Promise<void> => {
        const logger = baseLogger.appendName("bulkDelete");
        logger.log("Attempting to delete", params.ids);
        await SupabaseDBClient.from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in(dbTablePrimaryKey, params.ids as any)
          .throwOnError();
        logger.log("Finished `bulkDelete`");
      },
    };

    const mutationsClient =
      buildMutationsClient ?
        {
          ...baseClient,
          ...buildMutationsClient({
            clientLogger: baseLogger,
          }),
        }
      : undefined;

    const queriesClient =
      buildQueriesClient ?
        {
          ...baseClient,
          ...buildQueriesClient({
            clientLogger: baseLogger,
          }),
        }
      : undefined;

    // now attach the `use` hooks to our clients
    const modelClientWithHooks = withQueryHooks(modelClient, {
      queryFns: DEFAULT_QUERY_FN_NAMES,
      mutationFns: DEFAULT_MUTATION_FN_NAMES,
    });

    const baseClientKeys = objectKeys(baseClient);
    const queriesClientWithHooks =
      queriesClient ?
        withQueryHooks(queriesClient, {
          queryFns: objectKeys(
            omit(queriesClient, ...baseClientKeys),
            // This is safe to cast to `any`
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
          mutationFns: [],
        })
      : undefined;

    const mutationsClientWithHooks =
      mutationsClient ?
        withQueryHooks(mutationsClient, {
          queryFns: [],
          mutationFns: objectKeys(
            omit(mutationsClient, ...baseClientKeys),
            // This is safe to cast to `any`
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) as any,
        })
      : undefined;

    return {
      ...modelClientWithHooks,
      ...queriesClientWithHooks,
      ...mutationsClientWithHooks,
      QueryKeys: {
        ...modelClientWithHooks.QueryKeys,
        ...queriesClientWithHooks?.QueryKeys,
        ...mutationsClientWithHooks?.QueryKeys,
      },

      // Using `any` here only because TypeScript is struggling with the
      // complexity of the generics and function name extractions.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}
