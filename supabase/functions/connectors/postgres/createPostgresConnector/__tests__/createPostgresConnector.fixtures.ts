import { identity } from "@avandar/utils";
import { vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";
import type {
  PostgresQueryRunner,
  PostgresSql,
} from "@sbfn/connectors/postgres/PostgresSql.types.ts";

/** The saved connection every connector test in this suite reads. */
export const SAVED_CONNECTION_ID = "44444444-4444-4444-4444-444444444444";

/**
 * A connector context whose admin client returns one saved connection to
 * `host` and decrypts its password, as `openSavedConnection` expects.
 */
export function makeSavedConnectionContext(host: string): ConnectorContext {
  const builder = {
    select: vi.fn(() => {
      return builder;
    }),
    eq: vi.fn(() => {
      return builder;
    }),
    update: vi.fn(() => {
      return builder;
    }),
    maybeSingle: vi.fn(async () => {
      return {
        data: {
          connection_id: SAVED_CONNECTION_ID,
          workspace_id: "33333333-3333-3333-3333-333333333333",
          host,
          port: 5432,
          database_name: "postgres",
          username: "reader",
          ssl_mode: "require",
          vault_secret_id: "55555555-5555-5555-5555-555555555555",
        },
        error: null,
      };
    }),
  };
  const supabaseAdminClient = {
    rpc: vi.fn(async () => {
      return { data: "hunter2", error: null };
    }),
    from: vi.fn(() => {
      return builder;
    }),
  };
  return {
    workspaceId: "33333333-3333-3333-3333-333333333333",
    supabaseClient: undefined as unknown as ConnectorContext["supabaseClient"],
    supabaseAdminClient:
      supabaseAdminClient as unknown as ConnectorContext["supabaseAdminClient"],
  };
}

/**
 * A fake connection that answers each query through `respond`, keyed on the
 * query's own text and its interpolated values, and runs a transaction's
 * queries against itself.
 */
export function makeFakeSql(
  respond: (queryText: string, values: unknown[]) => unknown,
): PostgresSql {
  const fakeSql = vi.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      return respond(strings.join(" "), values);
    },
  ) as unknown as PostgresSql;
  fakeSql.unsafe = vi.fn(identity);
  // `begin` is generic in what `run` returns, which a `vi.fn` cannot be.
  fakeSql.begin = vi.fn(
    async (
      _options: string,
      run: (transaction: PostgresQueryRunner) => Promise<unknown>,
    ) => {
      return run(fakeSql);
    },
  ) as PostgresSql["begin"];
  fakeSql.end = vi.fn(async () => {});
  return fakeSql;
}

/** A fake server-side cursor over a relation's rows. */
export type FakeRowsCursor = {
  /**
   * Answers the cursor's `declare`, once awaited, and each
   * `fetch forward <n>` from it the way Postgres does: handing out up to `n`
   * of the remaining rows, and failing for a cursor that was never declared.
   * Returns `undefined` for any other query.
   */
  respond: Parameters<typeof makeFakeSql>[0];

  /** How many rows each fetch asked for, in order. */
  requestedBatchRowCounts: number[];

  /** How many rows the fetches have handed out so far. */
  fetchedRowCount: () => number;

  /** How many fetches were sent unprepared, through `simple()`. */
  unpreparedFetchCount: () => number;
};

/** What a fake cursor has declared and handed out so far. */
type FakeCursorState = {
  rows: ReadonlyArray<Record<string, unknown>>;
  declaredCursorName: unknown;
  fetchedRowCount: number;
  unpreparedFetchCount: number;
  requestedBatchRowCounts: number[];
};

/**
 * A fake `declare`. A postgres.js query only runs once awaited, so the cursor
 * only exists from then on.
 */
function _makeFakeDeclare(
  options: Readonly<{ state: FakeCursorState; cursorName: unknown }>,
): PromiseLike<unknown[]> {
  return {
    then: (onDeclared, onFailed) => {
      options.state.declaredCursorName = options.cursorName;
      return Promise.resolve([]).then(onDeclared, onFailed);
    },
  };
}

/** A fetch's result, which records being sent unprepared. */
function _makeFakeFetchResult(
  options: Readonly<{ state: FakeCursorState; result: Promise<unknown[]> }>,
): Promise<unknown[]> {
  // Awaited through `simple()`, so a refused fetch is never unhandled.
  options.result.catch(() => {});
  return Object.assign(options.result, {
    simple: () => {
      options.state.unpreparedFetchCount += 1;
      return options.result;
    },
  });
}

/**
 * A fake `fetch forward <n> from <cursor>`. The fake's `unsafe` returns its
 * text, so the row count and cursor name arrive as the interpolated values.
 */
function _makeFakeFetch(
  options: Readonly<{ state: FakeCursorState; values: unknown[] }>,
): Promise<unknown[]> {
  const { state } = options;
  const [batchRowCountText, cursorName] = options.values;
  if (cursorName !== state.declaredCursorName) {
    const error = new Error(`cursor "${String(cursorName)}" does not exist`);
    return _makeFakeFetchResult({ state, result: Promise.reject(error) });
  }
  const batchRowCount = Number(batchRowCountText);
  state.requestedBatchRowCounts.push(batchRowCount);
  const batch = state.rows.slice(
    state.fetchedRowCount,
    state.fetchedRowCount + batchRowCount,
  );
  state.fetchedRowCount += batch.length;
  return _makeFakeFetchResult({ state, result: Promise.resolve(batch) });
}

/** A fake server-side cursor that reads `rows` in order. */
export function makeFakeRowsCursor(
  rows: ReadonlyArray<Record<string, unknown>>,
): FakeRowsCursor {
  const state: FakeCursorState = {
    rows,
    declaredCursorName: undefined,
    fetchedRowCount: 0,
    unpreparedFetchCount: 0,
    requestedBatchRowCounts: [],
  };
  return {
    requestedBatchRowCounts: state.requestedBatchRowCounts,
    fetchedRowCount: () => {
      return state.fetchedRowCount;
    },
    unpreparedFetchCount: () => {
      return state.unpreparedFetchCount;
    },
    respond: (queryText, values) => {
      if (queryText.includes("declare")) {
        return _makeFakeDeclare({ state, cursorName: values[0] });
      }
      return queryText.includes("fetch forward")
        ? _makeFakeFetch({ state, values })
        : undefined;
    },
  };
}

/**
 * What `explain (format json)` returns for a plan the planner expects to
 * produce `plannedRowCount` rows.
 */
export function makeFakeQueryPlan(plannedRowCount: number): Promise<unknown[]> {
  return Promise.resolve([
    { "QUERY PLAN": [{ Plan: { "Plan Rows": plannedRowCount } }] },
  ]);
}

/** A relation of one column, read through a fake cursor. */
type FakeCursorReadOptions = {
  cursor: FakeRowsCursor;

  /** The row count the relation's `count(*)` reports. */
  rowCount: number;

  /** The row count the planner estimates. Defaults to `rowCount`. */
  plannedRowCount?: number;

  /**
   * The relation's `information_schema.tables.table_type`. Defaults to
   * `BASE TABLE`.
   */
  tableType?: string;
  columnName: string;

  /** The column's type, as `information_schema.columns` names it. */
  dataType: string;

  /** Runs before each query is answered, with that query's text. */
  onQuery?: (queryText: string) => void;
};

/**
 * A fake connection to a one-column relation whose rows are read through
 * `cursor`: it answers the still-exists check, the planner's row estimate,
 * the exact row count, the column sizes, and the cursor's own queries.
 */
export function makeFakeSqlForCursorRead(
  options: Readonly<FakeCursorReadOptions>,
): PostgresSql {
  return makeFakeSql((queryText, values) => {
    options.onQuery?.(queryText);
    if (queryText.includes("limit 1")) {
      return Promise.resolve([
        { table_type: options.tableType ?? "BASE TABLE" },
      ]);
    }
    if (queryText.includes("explain")) {
      return makeFakeQueryPlan(options.plannedRowCount ?? options.rowCount);
    }
    if (queryText.includes("count(*)")) {
      return Promise.resolve([{ exact_count: String(options.rowCount) }]);
    }
    if (queryText.includes("character_maximum_length")) {
      return Promise.resolve([
        {
          column_name: options.columnName,
          data_type: options.dataType,
          character_maximum_length: null,
        },
      ]);
    }
    return options.cursor.respond(queryText, values);
  });
}

/**
 * Reads CSV bytes back as text. Through `FileReader` because the test
 * environment's jsdom `Blob` has no `text()` method.
 */
export function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(blob);
  });
}
