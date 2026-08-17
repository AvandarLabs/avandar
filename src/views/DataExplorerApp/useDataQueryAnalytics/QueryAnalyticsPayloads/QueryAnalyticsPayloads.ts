import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type {
  AnalyticsEventPayloads,
  QueryAnalyticsSurface,
  QueryErrorClass,
} from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";

/** Caps what one failure can add to a usage_analytics_events row. */
const MAX_ERROR_MESSAGE_CHARS = 500;

type ErrorClassPattern = {
  errorClass: QueryErrorClass;
  pattern: RegExp;
};

/**
 * Ordered classification table. Order is load-bearing: a DuckDB binder error
 * for a missing column also contains "not found in FROM clause", so the
 * column rule has to win over the table rule.
 */
const ERROR_CLASS_PATTERNS: readonly ErrorClassPattern[] = [
  {
    errorClass: "missing_column",
    pattern:
      /referenced column|column .* not found|does not have a column named/i,
  },
  {
    errorClass: "missing_table",
    pattern:
      /table with name .* does not exist|relation .* does not exist|not found in from clause|no such table|referenced table .* not found|could not find the table/i,
  },
  { errorClass: "syntax", pattern: /parser error|syntax error/i },
  {
    errorClass: "permission",
    pattern: /permission denied|row-level security|not authorized|forbidden/i,
  },
  { errorClass: "timeout", pattern: /timeout|timed out/i },
  {
    errorClass: "network",
    pattern: /failed to fetch|networkerror|network error|load failed/i,
  },
];

function _getTextFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function _getErrorClassFromMessage(message: string): QueryErrorClass {
  const match = ERROR_CLASS_PATTERNS.find((entry) => {
    return entry.pattern.test(message);
  });
  return match?.errorClass ?? "unknown";
}

/**
 * Strips everything the payload is barred from carrying, then truncates.
 *
 * Covers every way DuckDB and PostgREST are known to leak user data into an
 * error string: a `LINE n:` echo of the submitted SQL, a quoted offending
 * value in conversion errors, a quoted or parenthesised value in constraint
 * and unique-violation errors, and raw long-digit keys. Double-quoted
 * identifiers otherwise survive, because knowing which column was missing is
 * the entire diagnostic value of the event and an identifier is schema rather
 * than data.
 *
 * Output is capped at `MAX_ERROR_MESSAGE_CHARS` and is safe to write to
 * `usage_analytics_events.payload`.
 */
function _sanitizeMessage(message: string): string {
  // Only line one is inspected for the SQL echo, which makes this a joint
  // guarantee with the callers: nothing may wrap an error as
  // `new Error(`Query failed: ${sql}`)`, which would put the SQL on line one
  // and defeat both the echo strip and the truncation below. Nothing does
  // that today; keep it that way.
  const firstLine = message.split("\n")[0] ?? "";
  const sqlEchoIndex = firstLine.search(/\bLINE \d+:/);
  const withoutSqlEcho =
    sqlEchoIndex === -1 ? firstLine : firstLine.slice(0, sqlEchoIndex);
  // The double-quote and parenthesis masks must run before the greedy
  // single-quote mask. A quoted value containing an apostrophe would
  // otherwise consume their delimiters, and the customer value survives.
  return (
    withoutSqlEcho
      .replace(/(duplicate key )"[^"]*"/gi, '$1"?"')
      .replace(/\([^)]*\)=\([^)]*\)/g, "(?)=(?)")
      // Deliberately greedy (`.*`, not `[^']*`): a balanced-pair match fails
      // open on any value containing an apostrophe (`'O'Brien'` leaves
      // `Brien` exposed), and an odd quote count from a driver-truncated
      // message breaks pairing entirely. Greedy matching can collapse two
      // literals on one line into a single masked span, losing some
      // diagnostic text. That is the correct trade for a privacy control:
      // losing context is recoverable, leaking a customer value is not.
      .replace(/'.*'/g, "'?'")
      .replace(/\b\d{4,}\b/g, "?")
      .trim()
      .slice(0, MAX_ERROR_MESSAGE_CHARS)
  );
}

/** Privacy-safe payload builders for query execution analytics. */
export const QueryAnalyticsPayloads = {
  /**
   * Builds the `query.ran` payload for a run that succeeded.
   *
   * Every field comes from the run's own record rather than from the query
   * observer, so the counts, timing, and trigger all describe the same
   * execution.
   */
  fromResult: (
    options: Readonly<{
      runMetadata: Extract<DataQueryRunMetadata, { outcome: "success" }>;
    }>,
  ): AnalyticsEventPayloads["query.ran"] => {
    const { runMetadata } = options;
    return {
      trigger: runMetadata.trigger,
      source: runMetadata.source,
      dataSourceType: runMetadata.dataSourceType,
      rowCount: runMetadata.rowCount,
      columnCount: runMetadata.columnCount,
      durationMs: Math.round(runMetadata.durationMs),
      didAutoLimit: runMetadata.didAutoLimit,
    };
  },

  /**
   * Builds the `query.failed` payload for a run that threw.
   *
   * The error is classified and sanitised, never carried verbatim: DuckDB and
   * PostgREST both echo submitted values into their messages.
   */
  fromError: (
    options: Readonly<{
      surface: QueryAnalyticsSurface;
      runMetadata: Extract<DataQueryRunMetadata, { outcome: "error" }>;
    }>,
  ): AnalyticsEventPayloads["query.failed"] => {
    const { surface, runMetadata } = options;
    const { error, isOffline } = runMetadata;
    const message = _getTextFromError(error);
    return {
      surface,
      trigger: runMetadata.trigger,
      // Offline wins over the message: when the device is offline the query
      // failed because it could not run at all, whatever DuckDB reported on
      // the way down.
      errorClass: isOffline ? "offline" : _getErrorClassFromMessage(message),
      errorMessage: _sanitizeMessage(message),
      isOffline,
    };
  },
};
