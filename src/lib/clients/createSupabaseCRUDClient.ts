import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { ILogger } from "../Logger";
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
> = WithLogger<
  WithQueryHooks<
    Client,
    Extract<HookableFnName<Client>, DefaultQueryFnName>,
    Extract<HookableFnName<Client>, DefaultMutationFnName>
  >
>;

/**
 * Creates a client for a model that maps to a Supabase table.
 *
 * It also creates `use` hooks for the `DEFAULT_QUERY_FN_NAMES` and
 * `DEFAULT_MUTATION_FN_NAMES`.
 */
export function createSupabaseCRUDClient<M extends SupabaseModelCRUDTypes>({
  modelName,
  tableName,
  parsers,
  dbTablePrimaryKey,
}: {
  modelName: M["modelName"];
  tableName: M["tableName"];

  /**
   * A registry of parsers for converting between model variants and
   * database variants.
   */
  parsers: ModelCRUDParserRegistry<M>;
  dbTablePrimaryKey: M["dbTablePrimaryKey"];
}): SupabaseCRUDClient<ModelCRUDClient<M>> {
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
        id: M["modelPrimaryKeyType"];
      }): Promise<M["Read"] | undefined> => {
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
          .throwOnError();

        logger.log(`All ${modelName}s from db`, data);

        const models = data.map((dbRow) => {
          const model = parsers.fromDBReadToModelRead(dbRow);
          return model;
        });

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

        const dataToInsert = parsers.fromModelInsertToDBInsert(params.data);
        const { data: insertedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dataToInsert as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();

        logger.log(`Inserted ${modelName} into db`, insertedData);

        const insertedModel = parsers.fromDBReadToModelRead(insertedData);
        return insertedModel;
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
        const dataToUpdate = parsers.fromModelUpdateToDBUpdate(params.data);
        const { data: updatedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(dataToUpdate as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();
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
        await SupabaseDBClient.from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .throwOnError();
      },
    };

    return withQueryHooks(modelClient, {
      queryFns: DEFAULT_QUERY_FN_NAMES,
      mutationFns: DEFAULT_MUTATION_FN_NAMES,
    });
  });
}
