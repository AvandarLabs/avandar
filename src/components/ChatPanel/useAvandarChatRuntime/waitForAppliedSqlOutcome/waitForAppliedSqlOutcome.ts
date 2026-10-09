import { match } from "ts-pattern";
import { isWorkspaceRawSqlDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Query, QueryCache } from "@tanstack/react-query";

/**
 * How the Data Explorer query for SQL the chat applied ended.
 *
 * - `rows`: it succeeded and returned at least one row.
 * - `empty`: it succeeded with no rows.
 * - `failed`: it errored, after any retries the query client makes.
 * - `unknown`: no outcome was observed, because nothing ran the SQL or it did
 *   not settle in time.
 */
export type AppliedSqlOutcome = "rows" | "empty" | "failed" | "unknown";

/**
 * How long a chat turn waits for the explorer query before it gives up and
 * reports `unknown`. Long enough for a first load of a large dataset.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * The query the Data Explorer is showing for `rawSql`: the matching query
 * with a mounted observer, so a cached run of the same statement that nothing
 * displays any more cannot answer for it.
 */
function _findDisplayedQuery(
  options: Readonly<{
    queryCache: QueryCache;
    workspaceId: string;
    rawSql: string;
  }>,
): Query | undefined {
  return options.queryCache
    .findAll({
      predicate: (query) => {
        return (
          query.getObserversCount() > 0 &&
          isWorkspaceRawSqlDataQueryKey(query.queryKey, options)
        );
      },
    })
    .at(-1);
}

function _getSettledOutcome(
  query: Query | undefined,
): AppliedSqlOutcome | undefined {
  return query && query.state.fetchStatus === "idle"
    ? match(query.state.status)
        .with("pending", () => {
          return undefined;
        })
        .with("error", (): AppliedSqlOutcome => {
          return "failed";
        })
        .with("success", (): AppliedSqlOutcome => {
          // The cache types every query's data as unknown; a
          // `useDataQuery` query always holds a `QueryResult`.
          const result = query.state.data as QueryResult.T | undefined;
          return (result?.numRows ?? 0) > 0 ? "rows" : "empty";
        })
        .exhaustive()
    : undefined;
}

/**
 * Waits for the Data Explorer to finish running SQL the chat just applied and
 * reports how it ended, so the assistant only claims results that exist.
 *
 * The explorer runs the statement through `useDataQuery` once it renders the
 * new `rawSql`, so this watches the shared query cache rather than running
 * the SQL a second time.
 *
 * @param options.queryCache The cache the explorer's queries live in.
 * @param options.workspaceId The workspace the explorer runs the SQL against.
 * @param options.rawSql The exact statement handed to the explorer.
 * @param options.timeoutMs How long to wait before resolving `unknown`.
 * @returns The outcome. Never rejects.
 */
export async function waitForAppliedSqlOutcome(
  options: Readonly<{
    queryCache: QueryCache;
    workspaceId: string;
    rawSql: string;
    timeoutMs?: number;
  }>,
): Promise<AppliedSqlOutcome> {
  const { queryCache, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  return await new Promise<AppliedSqlOutcome>((resolve) => {
    const readOutcome = (): AppliedSqlOutcome | undefined => {
      return _getSettledOutcome(_findDisplayedQuery(options));
    };
    const initialOutcome = readOutcome();
    if (initialOutcome) {
      resolve(initialOutcome);
      return;
    }

    let isSettled = false;
    const settle = (outcome: AppliedSqlOutcome): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      unsubscribe();
      clearTimeout(timeoutId);
      resolve(outcome);
    };
    // Neither callback can run before both constants below are assigned:
    // the cache notifies and the timer fires asynchronously.
    const unsubscribe = queryCache.subscribe(() => {
      const outcome = readOutcome();
      if (outcome) {
        settle(outcome);
      }
    });
    const timeoutId = setTimeout(() => {
      settle("unknown");
    }, timeoutMs);
  });
}
