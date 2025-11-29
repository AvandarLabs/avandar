import { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import { objectEntries } from "$/lib/utils/objects/objectEntries/objectEntries";
import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { match } from "ts-pattern";
import { EmptyObject } from "type-fest";
import {
  AvaSupabase,
  DatabaseTableNames,
  GetSupabaseClientOptions,
} from "@/db/supabase/AvaSupabase";
import { ModelCRUDParserRegistry } from "@/lib/models/makeParserRegistry";
import { assertIsDefined } from "@/lib/utils/asserts";
import { Database } from "@/types/database.types";
import { ILogger } from "../../../../shared/lib/Logger/Logger";
import {
  FilterOperator,
  FiltersByColumn,
} from "../../../../shared/lib/utils/filters/filters";
import { AnySupabaseModelCRUDTypes } from "../../models/SupabaseModelCRUDTypes";
import {
  createModelCRUDClient,
  HookableClient,
  ModelCRUDClient,
  UpsertOptions,
} from "../createModelCRUDClient";
import { withSupabaseClient } from "../withSupabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The maximum page size configured in Supabase */
const MAXIMUM_PAGE_SIZE = 1000;

export type SupabaseCRUDClient<
  M extends AnySupabaseModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient,
  ExtendedMutationsClient extends HookableClient,
> = ModelCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> & {
  setDBClient: (
    dbClient: SupabaseClient<Database>,
  ) => SupabaseCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient>;
};

type SupabaseFilterableQuery = PostgrestFilterBuilder<
  GetSupabaseClientOptions<Database>,
  Database["public"],
  Database["public"]["Tables"][DatabaseTableNames]["Row"],
  unknown[],
  unknown,
  unknown
>;

/**
 * Creates a client for a model that maps to a Supabase table.
 */
export function createSupabaseCRUDClient<
  M extends AnySupabaseModelCRUDTypes,
  ExtendedQueriesClient extends HookableClient = EmptyObject,
  ExtendedMutationsClient extends HookableClient = EmptyObject,
>(options: {
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
   * @param config.clientLogger - A logger for the client.
   * @param config.dbClient - The database client to use for interacting with
   *   Supabase.
   * @returns An object of additional query functions. Each function must
   * return a promise.
   */
  queries?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<Database>;
    parsers: ModelCRUDParserRegistry<M>;
  }) => ExtendedQueriesClient;

  /**
   * Additional mutation functions to add to the client. These functions
   * will get wrapped in `useMutation` hooks.
   * @param config
   * @param config.clientLogger - A logger for the client.
   * @param config.dbClient - The database client to use for interacting with
   *   Supabase.
   * @returns An object of additional mutation functions. Each function must
   * return a promise.
   */
  mutations?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<Database>;
    parsers: ModelCRUDParserRegistry<M>;
  }) => ExtendedMutationsClient;

  /**
   * The database client to use for interacting with Supabase.
   * Defaults to our global `AvaSupabase`.
   * We override this when we want to test or seed data with an admin client.
   */
  dbClient?: SupabaseClient<Database>;
}): SupabaseCRUDClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const {
    modelName,
    tableName,
    parsers,
    dbTablePrimaryKey,
    queries,
    mutations,
    dbClient = AvaSupabase.DB,
  } = options;

  function _applyFiltersToSupabaseQuery<Query extends SupabaseFilterableQuery>(
    query: Query,
    filters: FiltersByColumn<M["DBRead"]>,
  ): SupabaseFilterableQuery {
    let newQuery = query;
    objectKeys(filters).forEach((column) => {
      const filter = filters[column as keyof M["DBRead"]];
      if (filter) {
        objectEntries(filter).forEach(([operator, value]) => {
          // currently we only support `eq` filters
          match(operator as FilterOperator)
            .with("eq", () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              newQuery = query.eq(String(column), value as any);
            })
            .with("in", () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              newQuery = query.in(String(column), value as any);
            })
            .exhaustive();
        });
      }
    });
    return newQuery;
  }

  const modelClient = createModelCRUDClient({
    modelName,
    parsers,
    additionalQueries: (config) => {
      return (queries?.({ ...config, dbClient, parsers }) ??
        {}) as ExtendedQueriesClient;
    },
    additionalMutations: (config) => {
      return (mutations?.({ ...config, dbClient, parsers }) ??
        {}) as ExtendedMutationsClient;
    },

    crudFunctions: {
      getById: async (params: {
        id: M["modelPrimaryKeyType"] | null | undefined;
        logger: ILogger;
      }): Promise<M["DBRead"] | undefined> => {
        if (params.id === undefined || params.id === null) {
          return undefined;
        }
        const { data } = await dbClient
          .from(tableName)
          .select("*")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .maybeSingle<M["DBRead"]>()
          .throwOnError();
        return data ?? undefined;
      },

      getCount: async (params: {
        where?: FiltersByColumn<M["DBRead"]>;
        logger: ILogger;
      }): Promise<number | null> => {
        const { where } = params;
        let query = dbClient.from(tableName).select("*", {
          count: "exact",
          head: true,
        }) as SupabaseFilterableQuery;

        if (where) {
          query = _applyFiltersToSupabaseQuery(query, where);
        }

        const { count } = await query.throwOnError();
        return count ?? null;
      },

      getPage: async (params: {
        where?: FiltersByColumn<M["DBRead"]>;
        pageSize: number;
        pageNum: number;
        logger: ILogger;
      }) => {
        const { where, pageSize, pageNum, logger } = params;
        let query = dbClient
          .from(tableName)
          .select("*") as SupabaseFilterableQuery;

        if (where) {
          query = _applyFiltersToSupabaseQuery(query, where);
        }

        if (pageSize > MAXIMUM_PAGE_SIZE) {
          logger.warn(
            `Page size is greater than ${MAXIMUM_PAGE_SIZE}. Supabase will only return ${MAXIMUM_PAGE_SIZE} rows.`,
          );
        }

        // Now apply the page range
        const startIndex = pageNum * pageSize;
        const endIndex = (pageNum + 1) * pageSize;
        const { data: dbRows } = await query
          .range(startIndex, endIndex)
          .overrideTypes<Array<M["DBRead"]>, { merge: false }>()
          .throwOnError();
        return dbRows;
      },

      insert: async (
        params: UpsertOptions & { data: M["DBInsert"]; logger: ILogger },
      ) => {
        if (params.upsert) {
          assertIsDefined(
            params.onConflict,
            "`onConflict` must be defined when upserting",
          );
          const { columnNames, ignoreDuplicates } = params.onConflict;
          const { data: upsertedData } = await dbClient
            .from(tableName)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(params.data as any, {
              onConflict: columnNames.join(","),
              ignoreDuplicates,
            })
            .select()
            .single<M["DBRead"]>()
            .throwOnError();
          return upsertedData;
        }

        const { data: insertedData } = await dbClient
          .from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(params.data as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();
        return insertedData;
      },

      bulkInsert: async (
        params: UpsertOptions & {
          data: ReadonlyArray<M["DBInsert"]>;
          logger: ILogger;
        },
      ) => {
        if (params.upsert) {
          assertIsDefined(
            params.onConflict,
            "`onConflict` must be defined when upserting",
          );
          const { columnNames, ignoreDuplicates } = params.onConflict;
          const { data: upsertedRows } = await dbClient
            .from(tableName)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(params.data as any, {
              onConflict: columnNames.join(","),
              ignoreDuplicates,
            })
            .select()
            .overrideTypes<Array<M["DBRead"]>, { merge: false }>()
            .throwOnError();
          return upsertedRows;
        }

        const { data: insertedRows } = await dbClient
          .from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(params.data as any)
          .select()
          .overrideTypes<Array<M["DBRead"]>, { merge: false }>()
          .throwOnError();
        return insertedRows;
      },

      update: async (params: {
        id: M["modelPrimaryKeyType"];
        data: M["DBUpdate"];
        logger: ILogger;
      }) => {
        const { data: updatedData } = await dbClient
          .from(tableName)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(params.data as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .select()
          .single<M["DBRead"]>()
          .throwOnError();
        return updatedData;
      },

      delete: async (params: {
        id: M["modelPrimaryKeyType"];
        logger: ILogger;
      }) => {
        await dbClient
          .from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq(dbTablePrimaryKey, params.id as any)
          .throwOnError();
      },

      bulkDelete: async (params: {
        ids: ReadonlyArray<M["modelPrimaryKeyType"]>;
        logger: ILogger;
      }) => {
        await dbClient
          .from(tableName)
          .delete()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .in(dbTablePrimaryKey, params.ids as any)
          .throwOnError();
      },
    },
  });

  return withSupabaseClient(
    modelClient as SupabaseCRUDClient<
      M,
      ExtendedQueriesClient,
      ExtendedMutationsClient
    >,
    (newDBClient: SupabaseClient<Database>) => {
      return createSupabaseCRUDClient({ ...options, dbClient: newDBClient });
    },
  );
}
