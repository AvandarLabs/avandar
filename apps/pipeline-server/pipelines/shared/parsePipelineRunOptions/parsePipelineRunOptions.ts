import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/** Run options as a request body or argv carries them, before validation. */
export type RawPipelineRunOptions = Readonly<{
  incremental?: unknown;
  since?: unknown;
  until?: unknown;
  limit?: unknown;
}>;

/** ISO 8601 with an explicit zone: `Z` or `+hh:mm`. */
const ISO_TIMESTAMP_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

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

function _parseTimestamp(
  name: "since" | "until",
  value: unknown,
): Date | undefined {
  if (value === undefined) {
    return undefined;
  }
  const date =
    typeof value === "string" && ISO_TIMESTAMP_WITH_ZONE.test(value)
      ? new Date(value)
      : undefined;
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
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    throw new Error(
      `A pipeline limit must be a positive integer, got ${JSON.stringify(value)}.`,
    );
  }
  return limit;
}

/**
 * Validates a run's options, from a request body or from argv. A full run is
 * the default. `since` and `until` must carry a timezone, so a bare date is
 * never guessed at.
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
  };
}
