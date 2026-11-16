import { ETL_SCOPE_KEY_PATTERN } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/** Run options as a request body or argv carries them, before validation. */
export type RawPipelineRunOptions = Readonly<{
  incremental?: unknown;
  since?: unknown;
  until?: unknown;
  limit?: unknown;
  scopes?: unknown;
}>;

/**
 * ISO 8601 with an explicit zone: `Z` or `+hh:mm`. Captures year, month, day,
 * hour, minute, and second, so the parts can be checked for a real time.
 */
const ISO_TIMESTAMP_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Plain decimal digits, as a limit string must be. */
const DIGITS_ONLY = /^\d+$/;

function _parseIncremental(value: unknown): boolean {
  if (value === undefined || value === false) {
    return false;
  }
  if (value === true) {
    return true;
  }
  throw new Error(
    `incremental must be true or false, got ${JSON.stringify(value)}.`,
  );
}

/**
 * Whether a timestamp's written date and time parts name a real wall-clock
 * time. `Date` silently rolls `02-30` into March and `T24:00` into the next
 * day, so the parts are rebuilt in UTC and compared.
 */
function _isRealDateTime(match: RegExpExecArray): boolean {
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((part) => {
      return Number(part ?? "0");
    }) as [number, number, number, number, number, number];
  const rebuilt = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  );
  return (
    rebuilt.getUTCFullYear() === year &&
    rebuilt.getUTCMonth() === month - 1 &&
    rebuilt.getUTCDate() === day &&
    rebuilt.getUTCHours() === hour &&
    rebuilt.getUTCMinutes() === minute &&
    rebuilt.getUTCSeconds() === second
  );
}

function _parseTimestamp(
  name: "since" | "until",
  value: unknown,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  const match =
    typeof value === "string" ? ISO_TIMESTAMP_WITH_ZONE.exec(value) : null;
  const date =
    match !== null && _isRealDateTime(match) ? new Date(match[0]) : undefined;
  if (date === undefined || Number.isNaN(date.getTime())) {
    throw new Error(
      `--${name} must be an ISO 8601 timestamp with a timezone, such as ` +
        `2026-10-01T00:00:00Z. Got ${JSON.stringify(value)}.`,
    );
  }
  return date;
}

function _parseLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const limit =
    typeof value === "string" && DIGITS_ONLY.test(value)
      ? Number(value)
      : value;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    throw new Error(
      `A pipeline limit must be a positive integer, got ${JSON.stringify(value)}.`,
    );
  }
  return limit;
}

function _isScopeKeyList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((scopeKey) => {
      return (
        typeof scopeKey === "string" && ETL_SCOPE_KEY_PATTERN.test(scopeKey)
      );
    })
  );
}

/**
 * Reads the scopes to crawl: a comma-separated string, as argv carries
 * it, or a list of strings, as a request body carries it.
 */
function _parseScopes(value: unknown): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const scopeKeys = typeof value === "string" ? value.split(",") : value;
  if (!_isScopeKeyList(scopeKeys)) {
    throw new Error(
      `--scope must name one or more scope keys separated by commas, such as format:csv,format:parquet. Got ${JSON.stringify(value)}.`,
    );
  }
  if (new Set(scopeKeys).size < scopeKeys.length) {
    throw new Error(
      `--scope names a scope more than once: ${JSON.stringify(value)}.`,
    );
  }
  return scopeKeys;
}

/**
 * Validates a run's options, from a request body or from argv. A full run is
 * the default. `since` and `until` must carry a timezone, so a bare date is
 * never guessed at. `scopes` is a comma-separated string or a list of valid
 * scope keys, each named once.
 *
 * @throws When an option is malformed, when `incremental` and `since` are
 * both given (they name two different lower bounds), or when `since` is not
 * before `until`.
 */
export function parsePipelineRunOptions(
  raw: RawPipelineRunOptions,
): PipelineRunOptions {
  const isIncremental = _parseIncremental(raw.incremental);
  const since = _parseTimestamp("since", raw.since);
  const until = _parseTimestamp("until", raw.until);
  const scopes = _parseScopes(raw.scopes);
  if (isIncremental && since !== undefined) {
    throw new Error(
      "Pass either --incremental or --since, not both: they name two different lower bounds.",
    );
  }
  if (
    since !== undefined &&
    until !== undefined &&
    since.getTime() >= until.getTime()
  ) {
    throw new Error("--since must be earlier than --until.");
  }
  return {
    mode: isIncremental ? "incremental" : "full",
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
    ...(raw.limit === undefined ? {} : { limit: _parseLimit(raw.limit) }),
    ...(scopes === undefined ? {} : { scopes }),
  };
}
