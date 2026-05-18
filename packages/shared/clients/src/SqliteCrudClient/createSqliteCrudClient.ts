import { callIpc } from "$/platform/ipc/client.ts";
import { RdbContracts } from "$/platform/ipc/contracts/RdbContracts.ts";
import { withSupabaseClient } from "@clients/mixins/withSupabaseClient.ts";
import { createModelCrudClient } from "@clients/ModelCrudClient/createModelCrudClient.ts";
import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined.ts";
import { objectEntries } from "@utils/objects/objectEntries.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { objectValuesMap } from "@utils/objects/objectValuesMap/objectValuesMap.ts";
import { match } from "ts-pattern";
import { EmptyObject } from "type-fest";
import type { ModelCrudParserRegistry } from "@clients/makeParserRegistry.ts";
import type { ClientReturningOnlyPromises } from "@clients/ModelCrudClient/ModelCrudClient.types.ts";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type {
  AnySupabaseCrudModelSpec,
  SupabaseCrudClient,
} from "@clients/SupabaseCrudClient/SupabaseCrudClient.types.ts";
import type { ILogger } from "@logger/Logger.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FilterOperator,
  FiltersByColumn,
} from "@utils/filters/filters.ts";

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
 *   `dbClient` is kept because the escape hatches still expect a
 *   Supabase handle and because consumers reach `.getDb()` for ad-hoc
 *   Supabase calls.
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
}): SupabaseCrudClient<M, ExtendedQueriesClient, ExtendedMutationsClient> {
  const {
    modelName,
    tableName,
    parsers,
    dbTablePrimaryKey,
    queries,
    mutations,
    dbClient,
  } = options;

  const pk = String(dbTablePrimaryKey);
  const table = _ident(String(tableName));

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
        const { rows } = await callIpc(RdbContracts.query, {
          sql: `select * from ${table} where ${_ident(pk)} = ? limit 1`,
          params: [params.id as unknown],
        });
        return (rows[0] as M["DBRead"] | undefined) ?? undefined;
      },

      getCount: async (params) => {
        const { where, params: bindings } = _buildWhereClause(params.where);
        const { rows } = await callIpc(RdbContracts.query, {
          sql: `select count(*) as _count from ${table}${where}`,
          params: bindings,
        });
        const count = (rows[0]?._count ?? 0) as number;
        return count;
      },

      getPage: async (params) => {
        const { where, params: bindings } = _buildWhereClause(params.where);
        const offset = params.pageNum * params.pageSize;
        const sql =
          `select * from ${table}${where} limit ? offset ?`;
        const { rows } = await callIpc(RdbContracts.query, {
          sql,
          params: [...bindings, params.pageSize, offset],
        });
        return rows as Array<M["DBRead"]>;
      },

      insert: async (params) => {
        const row = _serializeRowValues(params.data as Record<string, unknown>);
        const cols = objectKeys(row);
        const sql = _buildInsertSql({
          table,
          cols,
          pk,
          upsert: params.upsert ?? false,
          onConflict: params.onConflict,
        });
        const { rows } = await callIpc(RdbContracts.query, {
          sql,
          params: cols.map((col) => row[col]),
        });
        const returned = rows[0];
        assertIsDefined(returned, "insert returned no row");
        return returned as M["DBRead"];
      },

      bulkInsert: async (params) => {
        if (params.data.length === 0) {
          return [];
        }
        const allRows = params.data.map((rowData) =>
          _serializeRowValues(rowData as Record<string, unknown>),
        );
        // Take column set from the first row; assume every row in a
        // bulkInsert has the same shape (matches Postgres + Supabase
        // semantics).
        const cols = objectKeys(allRows[0]!);
        const placeholders =
          "(" + cols.map(() => "?").join(", ") + ")";
        const valuesClause = allRows.map(() => placeholders).join(", ");
        const sql = _buildInsertSql({
          table,
          cols,
          pk,
          valuesClause,
          upsert: params.upsert ?? false,
          onConflict: params.onConflict,
        });
        const bindings = allRows.flatMap((row) =>
          cols.map((col) => row[col]),
        );
        const { rows } = await callIpc(RdbContracts.query, {
          sql,
          params: bindings,
        });
        return rows as Array<M["DBRead"]>;
      },

      update: async (params) => {
        const row = _serializeRowValues(params.data as Record<string, unknown>);
        const cols = objectKeys(row);
        if (cols.length === 0) {
          // No-op update; just read the current row back.
          const { rows } = await callIpc(RdbContracts.query, {
            sql: `select * from ${table} where ${_ident(pk)} = ? limit 1`,
            params: [params.id as unknown],
          });
          const back = rows[0];
          assertIsDefined(back, `update found no row with ${pk}=${params.id}`);
          return back as M["DBRead"];
        }
        const setClause = cols.map((col) => `${_ident(col)} = ?`).join(", ");
        const sql = `update ${table} set ${setClause} where ${_ident(pk)} = ? returning *`;
        const { rows } = await callIpc(RdbContracts.query, {
          sql,
          params: [...cols.map((col) => row[col]), params.id as unknown],
        });
        const updated = rows[0];
        assertIsDefined(updated, `update found no row with ${pk}=${params.id}`);
        return updated as M["DBRead"];
      },

      delete: async (params) => {
        await callIpc(RdbContracts.run, {
          sql: `delete from ${table} where ${_ident(pk)} = ?`,
          params: [params.id as unknown],
        });
      },

      bulkDelete: async (params) => {
        if (params.ids.length === 0) {
          return;
        }
        const placeholders = params.ids.map(() => "?").join(", ");
        await callIpc(RdbContracts.run, {
          sql: `delete from ${table} where ${_ident(pk)} in (${placeholders})`,
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

/**
 * Quote an identifier (table or column name) with double quotes so
 * reserved words and snake_case names round-trip correctly. Embedded
 * double quotes are doubled per SQL grammar; nothing in the codebase
 * uses identifiers containing them today, but quoting keeps the path
 * safe if a future migration introduces one.
 */
function _ident(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/**
 * Build a parameterised WHERE clause from the model's
 * `FiltersByColumn` shape. Supports the same operators as the
 * Supabase client (`eq`, `in`) and emits placeholders rather than
 * interpolating values; the only thing that gets concatenated is the
 * caller-controlled column name.
 */
function _buildWhereClause<DBRead extends Record<string, unknown>>(
  filters: FiltersByColumn<DBRead> | undefined,
): { where: string; params: unknown[] } {
  if (!filters) {
    return { where: "", params: [] };
  }
  const clauses: string[] = [];
  const params: unknown[] = [];

  objectKeys(filters).forEach((column) => {
    const filter = filters[column];
    if (!filter) {
      return;
    }
    objectEntries(filter).forEach(([operator, value]) => {
      const quotedColumn = _ident(String(column));
      match(operator as FilterOperator)
        .with("eq", () => {
          clauses.push(`${quotedColumn} = ?`);
          params.push(value as unknown);
        })
        .with("in", () => {
          const values = (value as ReadonlyArray<unknown>) ?? [];
          if (values.length === 0) {
            // An empty IN list in SQL is invalid; degrade to a
            // contradiction so the surrounding query returns no rows.
            clauses.push("1 = 0");
            return;
          }
          const placeholders = values.map(() => "?").join(", ");
          clauses.push(`${quotedColumn} in (${placeholders})`);
          params.push(...values);
        })
        .exhaustive();
    });
  });

  return clauses.length === 0 ?
      { where: "", params: [] }
    : { where: ` where ${clauses.join(" and ")}`, params };
}

/**
 * Stringify object/array values so bun:sqlite can store them in
 * TEXT-affinity (`jsonb`) columns. Returns primitives unchanged.
 * Symmetric parse-on-read is intentionally not done here; model
 * parsers handle DBRead → ModelRead transforms and can pick up the
 * raw JSON strings.
 */
function _serializeRowValues(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return objectValuesMap(row, (value) => {
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
      return JSON.stringify(value);
    }
    return value;
  });
}

type BuildInsertSqlArgs = {
  table: string;
  cols: ReadonlyArray<string>;
  pk: string;
  valuesClause?: string;
  upsert: boolean;
  onConflict:
    | { columnNames: string[]; ignoreDuplicates: boolean }
    | undefined;
};

/**
 * Compose an `insert ... values ... [on conflict ...] returning *`
 * statement. `valuesClause` is provided for the bulk path; the single
 * insert path leaves it undefined and uses one `(?, ?, …)` row.
 */
function _buildInsertSql(args: Readonly<BuildInsertSqlArgs>): string {
  const { table, cols, pk, valuesClause, upsert, onConflict } = args;
  const colsClause = cols.map(_ident).join(", ");
  const values =
    valuesClause ??
    "(" + cols.map(() => "?").join(", ") + ")";
  let conflict = "";
  if (upsert) {
    assertIsDefined(onConflict, "`onConflict` must be defined when upserting");
    const onCols = onConflict.columnNames.map(_ident).join(", ");
    if (onConflict.ignoreDuplicates) {
      conflict = ` on conflict (${onCols}) do nothing`;
    } else {
      const updates = cols
        .filter((col) => col !== pk && !onConflict.columnNames.includes(col))
        .map((col) => `${_ident(col)} = excluded.${_ident(col)}`)
        .join(", ");
      conflict =
        updates.length === 0 ?
          ` on conflict (${onCols}) do nothing`
        : ` on conflict (${onCols}) do update set ${updates}`;
    }
  }
  return `insert into ${table} (${colsClause}) values ${values}${conflict} returning *`;
}
