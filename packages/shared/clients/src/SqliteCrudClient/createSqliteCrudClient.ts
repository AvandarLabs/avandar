import { assertIsDefined, objectKeys } from "@avandar/utils";
import { withSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";
import { createModelCrudClient } from "@clients/ModelCrudClient/createModelCrudClient.ts";
import {
  buildInsertSqlFromRows,
  buildOrderByClauseFromColumns,
  buildQuotedSqlIdentifier,
  buildWhereClauseFromFilters,
  serializeRowValues,
} from "@clients/SqliteCrudClient/SqliteSqlHelpers.ts";
import type { ILogger } from "@avandar/logger";
import type { ModelCrudParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type { SqliteTransport } from "@clients/SqliteCrudClient/SqliteTransport.types.ts";
import type {
  AnySupabaseCrudModelSpec,
  SupabaseCrudClient,
} from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmptyObject } from "type-fest";

/**
 * SQLite-backed CRUD client for the Electrobun desktop shell. Mirrors
 * the public surface of {@link createSupabaseCrudClient} so callers can
 * be branched between the two by `createRdbCrudClient` without
 * recompiling consumers.
 *
 * Reads and writes go through the typed IPC bridge to the Bun-main
 * process (`apps/desktop/main/ipc/rdb.ts`), which holds the only
 * `bun:sqlite` handle. The escape-hatch `queries` and `mutations`
 * factories still receive the live `SupabaseClient`: for now, those
 * custom functions target Supabase REST on both web and desktop, and
 * the sync engine will eventually route them through the local mirror.
 *
 * Known limitations:
 * - JSON-typed columns (`config`, `metadata`, `filter`) are
 *   stringified on write but returned as raw strings on read; model
 *   parsers must coerce when they consume them.
 * - Boolean-typed columns come back from bun:sqlite as integer 0/1.
 *
 * @param options - Same shape as `createSupabaseCrudClient`'s options.
 *   `dbClient` is required because the escape hatches expect a Supabase
 *   handle and because consumers reach `.getDb()` for ad-hoc Supabase
 *   calls.
 */
export function createSqliteCrudClient<
  M extends AnySupabaseCrudModelSpec,
  ExtendedQueriesClient extends ClientReturningOnlyPromises = EmptyObject,
  ExtendedMutationsClient extends ClientReturningOnlyPromises = EmptyObject,
>(options: {
  modelName: M["modelName"];
  tableName: M["tableName"];
  parsers: ModelCrudParserRegistry<M>;
  dbTablePrimaryKey: M["dbTablePrimaryKey"];
  queries?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<RegisteredSupabaseDatabase>;
    parsers: ModelCrudParserRegistry<M>;
  }) => ExtendedQueriesClient;
  mutations?: (config: {
    clientLogger: ILogger;
    dbClient: SupabaseClient<RegisteredSupabaseDatabase>;
    parsers: ModelCrudParserRegistry<M>;
  }) => ExtendedMutationsClient;
  dbClient: SupabaseClient<RegisteredSupabaseDatabase>;

  /**
   * How to reach the SQLite database. Injected so this package carries no
   * dependency on any particular IPC or driver.
   */
  sqliteTransport: SqliteTransport;
}): SupabaseCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const {
    modelName,
    tableName,
    parsers,
    dbTablePrimaryKey,
    queries,
    mutations,
    dbClient,
    sqliteTransport,
  } = options;

  const pk = String(dbTablePrimaryKey);
  const table = buildQuotedSqlIdentifier(String(tableName));

  const modelClient = createModelCrudClient({
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
      getById: async (params) => {
        if (params.id === undefined || params.id === null) {
          return undefined;
        }
        const { rows } = await sqliteTransport.query({
          sql: `select * from ${table} where ${buildQuotedSqlIdentifier(pk)} = ? limit 1`,
          params: [params.id as unknown],
        });
        return (rows[0] as M["DBRead"] | undefined) ?? undefined;
      },

      getCount: async (params) => {
        const { where, params: bindings } = buildWhereClauseFromFilters(
          params.where,
        );
        const { rows } = await sqliteTransport.query({
          sql: `select count(*) as _count from ${table}${where}`,
          params: bindings,
        });
        const count = (rows[0]?._count ?? 0) as number;
        return count;
      },

      getPage: async (params) => {
        const { where, params: bindings } = buildWhereClauseFromFilters(
          params.where,
        );
        const offset = params.pageNum * params.pageSize;
        const sql = `select * from ${table}${where}${buildOrderByClauseFromColumns(params.orderBy)} limit ? offset ?`;
        const { rows } = await sqliteTransport.query({
          sql,
          params: [...bindings, params.pageSize, offset],
        });
        return rows as Array<M["DBRead"]>;
      },

      insert: async (params) => {
        const row = serializeRowValues(params.data as Record<string, unknown>);
        const cols = objectKeys(row);
        const sql = buildInsertSqlFromRows({
          table,
          cols,
          pk,
          upsert: params.upsert ?? false,
          onConflict: params.onConflict,
        });
        const { rows } = await sqliteTransport.query({
          sql,
          params: cols.map((col) => {
            return row[col];
          }),
        });
        const returned = rows[0];
        assertIsDefined(returned, "insert returned no row");
        return returned as M["DBRead"];
      },

      bulkInsert: async (params) => {
        if (params.data.length === 0) {
          return [];
        }
        const allRows = params.data.map((rowData) => {
          return serializeRowValues(rowData as Record<string, unknown>);
        });
        // Take column set from the first row; assume every row in a
        // bulkInsert has the same shape (matches Postgres + Supabase
        // semantics).
        const cols = objectKeys(allRows[0]!);
        const placeholders =
          "(" +
          cols
            .map(() => {
              return "?";
            })
            .join(", ") +
          ")";
        const valuesClause = allRows
          .map(() => {
            return placeholders;
          })
          .join(", ");
        const sql = buildInsertSqlFromRows({
          table,
          cols,
          pk,
          valuesClause,
          upsert: params.upsert ?? false,
          onConflict: params.onConflict,
        });
        const bindings = allRows.flatMap((row) => {
          return cols.map((col) => {
            return row[col];
          });
        });
        const { rows } = await sqliteTransport.query({
          sql,
          params: bindings,
        });
        return rows as Array<M["DBRead"]>;
      },

      update: async (params) => {
        const row = serializeRowValues(params.data as Record<string, unknown>);
        const cols = objectKeys(row);
        if (cols.length === 0) {
          // No-op update; just read the current row back.
          const { rows } = await sqliteTransport.query({
            sql: `select * from ${table} where ${buildQuotedSqlIdentifier(pk)} = ? limit 1`,
            params: [params.id as unknown],
          });
          const back = rows[0];
          assertIsDefined(back, `update found no row with ${pk}=${params.id}`);
          return back as M["DBRead"];
        }
        const setClause = cols
          .map((col) => {
            return `${buildQuotedSqlIdentifier(col)} = ?`;
          })
          .join(", ");
        const sql = `update ${table} set ${setClause} where ${buildQuotedSqlIdentifier(pk)} = ? returning *`;
        const { rows } = await sqliteTransport.query({
          sql,
          params: [
            ...cols.map((col) => {
              return row[col];
            }),
            params.id as unknown,
          ],
        });
        const updated = rows[0];
        assertIsDefined(updated, `update found no row with ${pk}=${params.id}`);
        return updated as M["DBRead"];
      },

      delete: async (params) => {
        await sqliteTransport.run({
          sql: `delete from ${table} where ${buildQuotedSqlIdentifier(pk)} = ?`,
          params: [params.id as unknown],
        });
      },

      bulkDelete: async (params) => {
        if (params.ids.length === 0) {
          return;
        }
        const placeholders = params.ids
          .map(() => {
            return "?";
          })
          .join(", ");
        await sqliteTransport.run({
          sql: `delete from ${table} where ${buildQuotedSqlIdentifier(pk)} in (${placeholders})`,
          params: params.ids as unknown as unknown[],
        });
      },
    },
  });

  return modelClient.mixin(
    withSupabaseClient(dbClient),
  ) as unknown as SupabaseCrudClient<
    M,
    ExtendedQueriesClient,
    ExtendedMutationsClient
  >;
}
