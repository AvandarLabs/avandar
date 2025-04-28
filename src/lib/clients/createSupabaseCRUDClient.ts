import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { ILogger } from "../Logger";
import { UnknownObject } from "../types/common";
import { objectKeys } from "../utils/objects";
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
  ExtendedMutationsClient extends BaseClient,
> = WithLogger<
  WithQueryHooks<
    Client,
    Extract<HookableFnName<Client>, DefaultQueryFnName>,
    Extract<HookableFnName<Client>, DefaultMutationFnName>
  > &
    WithQueryHooks<
      ExtendedMutationsClient,
      never,
      HookableFnName<ExtendedMutationsClient>
    >
>;

/**
 * Creates a client for a model that maps to a Supabase table.
 *
 * It also creates `use` hooks for the `DEFAULT_QUERY_FN_NAMES` and
 * `DEFAULT_MUTATION_FN_NAMES`.
 */
export function createSupabaseCRUDClient<
  M extends SupabaseModelCRUDTypes,
  ExtendedMutationsClient extends UnknownObject,
>({
  modelName,
  tableName,
  parsers,
  dbTablePrimaryKey,
  mutations,
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
   * Additional mutation functions to add to the client. These functions
   * will get wrapped in `useMutation` hooks.
   */
  mutations?: (config: { logger: ILogger }) => ExtendedMutationsClient;
}): SupabaseCRUDClient<
  ModelCRUDClient<M>,
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
        id: M["modelPrimaryKeyType"] | undefined;
      }): Promise<M["Read"] | undefined> => {
        if (params.id === undefined) {
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
      getAll: async (): Promise<Array<M["Read"]>> => {
        baseLogger.warn("TODO(pablo): Pagination must be implemented.");
        const logger = baseLogger.appendName("getAll");

        const { data } = await SupabaseDBClient.from(tableName)
          .select("*")
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

    // build the extended mutations client
    const extendedClient =
      mutations ?
        {
          ...baseClient,
          ...mutations({
            logger: baseLogger,
          }),
        }
      : undefined;

    // now attach the hooks to both clients
    const modelClientWithHooks = withQueryHooks(modelClient, {
      queryFns: DEFAULT_QUERY_FN_NAMES,
      mutationFns: DEFAULT_MUTATION_FN_NAMES,
    });

    const extendedClientWithHooks =
      extendedClient ?
        withQueryHooks(extendedClient, {
          queryFns: [],

          // Technically this will allow some invalid function names to
          // be passed, but it will not cause any runtime errors or have
          // any significant memory or performance implications.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mutationFns: objectKeys(extendedClient) as any[],
        })
      : undefined;

    return {
      ...modelClientWithHooks,
      ...extendedClientWithHooks,
      QueryKeys: {
        ...modelClientWithHooks.QueryKeys,
        ...extendedClientWithHooks?.QueryKeys,
      },

      // Using `any` here only because TypeScript is struggling with the
      // complexity of the generics and function name extractions.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });
}
