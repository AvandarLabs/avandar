import { LISTING_CONTRACT_COLUMNS } from "@etl/stores/listingContractColumns";
import type {
  ListingRowValues,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

/** Columns that change on every write, so they never count as a change. */
const IGNORED_COLUMNS: ReadonlySet<keyof ListingRowValues> = new Set([
  "pipeline_run_id",
  "date_of_last_sync",
]);

/** Columns compared as instants: Postgres returns `+00:00`, not `Z`. */
const TIMESTAMP_COLUMNS: ReadonlySet<keyof ListingRowValues> = new Set([
  "date_of_last_update",
  "coverage_start_date",
  "coverage_end_date",
]);

function _stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(_stableStringify).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([keyA], [keyB]) => {
      return keyA < keyB ? -1 : 1;
    });
    const body = entries.map(([key, entryValue]) => {
      return `${JSON.stringify(key)}:${_stableStringify(entryValue)}`;
    });
    return `{${body.join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Passes a value through JSON the way supabase-js writes it and Postgres
 * returns it: `undefined` keys vanish, `undefined` array entries become
 * `null`, and a `Date` becomes its ISO string.
 */
function _roundTripThroughJson(value: unknown): unknown {
  const json = JSON.stringify(value);
  return json === undefined ? null : JSON.parse(json);
}

/** An instant as milliseconds, or the raw text when it does not parse. */
function _normalizeTimestamp(value: unknown): string {
  const text = String(value);
  const time = Date.parse(text);
  return Number.isNaN(time) ? `raw:${text}` : String(time);
}

function _normalize(column: keyof ListingRowValues, value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (TIMESTAMP_COLUMNS.has(column)) {
    return _normalizeTimestamp(value);
  }
  return _stableStringify(_roundTripThroughJson(value));
}

/**
 * Whether writing `next` would change nothing that matters about `stored`.
 * Every contract column is compared except `pipeline_run_id` and
 * `date_of_last_sync`, so a change to a pipeline's own mapping is caught
 * even when the source did not change.
 *
 * @param args.stored - The row as the listings table holds it.
 * @param args.next - The row this run would write.
 * @returns `true` when the write can be skipped.
 */
export function isListingRowUnchanged(args: {
  stored: StoredListingRow;
  next: ListingRowValues;
}): boolean {
  return LISTING_CONTRACT_COLUMNS.every((column) => {
    if (IGNORED_COLUMNS.has(column)) {
      return true;
    }
    return (
      _normalize(column, args.stored[column]) ===
      _normalize(column, args.next[column])
    );
  });
}
