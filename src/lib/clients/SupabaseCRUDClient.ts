import { SupabaseDBClient } from "@/lib/clients/SupabaseDBClient";
import { ModelCRUDParserRegistry } from "@/lib/utils/models/ModelCRUDParserRegistry";
import { SupabaseModelCRUDTypes } from "@/lib/utils/models/SupabaseModelCRUDTypes";
import { Tables } from "@/types/database.types";
import { ILogger } from "../Logger";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { ModelCRUDClient, WithLogger, withLogger } from "./ModelCRUDClient";
import {
  HookableFnName,
  WithQueryHooks,
  withQueryHooks,
} from "./withQueryHooks";
import type { DatabaseTableNames } from "@/lib/clients/SupabaseDBClient";

export type SupabaseCRUDClient<
  BaseClient extends ModelCRUDClient<ModelCRUDTypes>,
  UseQueryFnName extends HookableFnName<BaseClient> = never,
  UseMutationFnName extends HookableFnName<BaseClient> = never,
> = WithLogger<WithQueryHooks<BaseClient, UseQueryFnName, UseMutationFnName>>;

export function createSupabaseCRUDClient<
  TableName extends DatabaseTableNames,
  M extends SupabaseModelCRUDTypes<TableName>,
  ModelIdFieldType extends M["Read"][M["modelPrimaryKey"]],
  UseQueryFnName extends HookableFnName<ModelCRUDClient<M>> = never,
  UseMutationFnName extends HookableFnName<ModelCRUDClient<M>> = never,
>(clientConfig: {
  modelName: string;
  tableName: TableName;

  /**
   * A registry of parsers for converting between model variants and
   * database variants.
   */
  parsers: ModelCRUDParserRegistry<M>;
  dbTablePrimaryKey: Extract<keyof Tables<TableName>, string>;
  queryFns?: readonly UseQueryFnName[];
  mutationFns?: readonly UseMutationFnName[];
}): SupabaseCRUDClient<ModelCRUDClient<M>, UseQueryFnName, UseMutationFnName> {
  const {
    modelName,
    tableName,
    dbTablePrimaryKey,
    parsers,
    queryFns,
    mutationFns,
  } = clientConfig;

  const clientBuilder = (baseLogger: ILogger) => {
    const baseClient: ModelCRUDClient<M> = {
      getModelName: () => {
        return modelName;
      },

      getById: async (params: {
        id: ModelIdFieldType;
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

        const model = parsers.fromDBToModelRead.parse(data);
        return model;
      },

      getAll: async (): Promise<Array<M["Read"]>> => {
        baseLogger.warn("TODO(pablo): Pagination must be implemented.");
        const logger = baseLogger.appendName("getAll");

        const { data } = await SupabaseDBClient.from(tableName)
          .select("*")
          .throwOnError();

        logger.log(`All ${modelName}s from db`, data);

        const models = data.map((dbRow) => {
          const model = parsers.fromDBToModelRead.parse(dbRow);
          return model;
        });

        return models;
      },

      insert: async (params: { data: M["Insert"] }): Promise<M["Read"]> => {
        const logger = baseLogger.appendName("insert");

        const dataToInsert = parsers.fromModelInsertToDBInsert.parse(
          params.data,
        );
        const { data: insertedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(dataToInsert as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();

        logger.log(`Inserted ${modelName} into db`, insertedData);

        const insertedModel = parsers.fromDBToModelRead.parse(insertedData);
        return insertedModel;
      },

      update: async (params: {
        id: ModelIdFieldType;
        data: M["Update"];
      }): Promise<M["Read"]> => {
        const dataToUpdate = parsers.fromModelUpdateToDBUpdate.parse(
          params.data,
        );
        const { data: updatedData } = await SupabaseDBClient.from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(dataToUpdate as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();
        return parsers.fromDBToModelRead.parse(updatedData);
      },

      delete: async (params: { id: ModelIdFieldType }): Promise<void> => {
        await SupabaseDBClient.from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .throwOnError();
      },
    };

    return withQueryHooks(baseClient, { queryFns, mutationFns });
  };

  return withLogger(modelName, clientBuilder);
}
