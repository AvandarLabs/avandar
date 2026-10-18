import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/**
 * A single shared ceiling, imported by reference from both runtimes that
 * need it - `supabase/functions/connectors/postgres/` (the edge function
 * that actually enforces it) and
 * `src/clients/qetl/wrappers/PostgresTableWrapper/` (whose capability
 * record mirrors it so the mediator's bookkeeping agrees with what the
 * server will enforce). `shared/` is importable from both the browser and
 * Deno for exactly this reason - two runtimes needing the same number is
 * not a reason to duplicate it, only a reason to put it where both
 * can reach it.
 *
 * Bounded by the Supabase Edge Function runtime's own 250MB memory / 2s CPU
 * ceiling, not a free choice: an isolate is killed with a 546 at whichever
 * limit it hits first (https://supabase.com/docs/guides/functions/limits),
 * and the edge function holds the raw driver rows, the CSV string, and the
 * HTTP response body in memory at once - several times the eventual CSV's
 * own byte size. 150MB stays comfortably under that ceiling with the
 * overhead included; a relation needing on the order of a million rows in
 * one call is not reliably servable through an edge function at any cap
 * value, regardless of this number (AVA-379).
 */
export const POSTGRES_MAX_BYTES_PER_ACQUIRE = 150 * 1024 * 1024;

/**
 * One column's type metadata, as `information_schema.columns` reports it -
 * enough to estimate that column's average CSV-serialized width without
 * reading a single row.
 */
export type ColumnSizeInfo = {
  columnName: string;
  dataType: string;
  /** `information_schema.columns.character_maximum_length`; `null` when the
   * type has no declared bound (a bare `text`, or `varchar` with no `(n)`). */
  characterMaximumLength: number | null;
};

/**
 * Average CSV-text width for a fixed-shape type, in bytes. These are not
 * worst-case widths - `bigint`'s true maximum is 20 digits, but real bigint
 * columns are overwhelmingly auto-increment ids or similar, rarely anywhere
 * near that - so each value here is a realistic typical width, not a bound.
 * `numeric`/`decimal` are deliberately absent: without a declared precision
 * they can hold arbitrarily many digits, so they fall through to the
 * unbounded-text path below instead of pretending to a fixed width.
 */
const FIXED_WIDTH_CSV_BYTES: Record<string, number> = {
  boolean: 5, // "false"
  smallint: 4,
  integer: 7,
  bigint: 12,
  real: 12,
  "double precision": 16,
  date: 10, // "2024-01-01"
  "time without time zone": 8, // "13:45:00"
  "time with time zone": 14,
  "timestamp without time zone": 22, // "2024-01-01 13:45:00.123"
  "timestamp with time zone": 29, // same, plus a UTC offset
  uuid: 36, // always exactly this long, never an estimate
};

/**
 * Average CSV-text width for a column with no declared length bound
 * (`text`, `character varying` with no `(n)`, `json`/`jsonb`, or an
 * unbounded `numeric`), keyed by what the column name suggests it holds.
 * None of this is measured from real data - it is a best-effort estimate so
 * the pre-read check has *something* better than a flat guess to work from.
 * The post-read byte check (`createPostgresConnector.ts`) is the real
 * backstop for whichever of these estimates turns out wrong.
 */
const NAMED_TEXT_HEURISTICS: ReadonlyArray<{
  pattern: RegExp;
  averageBytes: number;
}> = [
  // Free-text fields: a sentence or short paragraph, not a label.
  {
    pattern: /(description|notes?|comment|summary|bio|remarks)/i,
    averageBytes: 280,
  },
  { pattern: /(body|content|message|details?)/i, averageBytes: 220 },
  // Short, structured text.
  { pattern: /(title|subtitle|headline)/i, averageBytes: 55 },
  { pattern: /(url|link|href|website)/i, averageBytes: 75 },
  { pattern: /(address|street)/i, averageBytes: 40 },
  { pattern: /email/i, averageBytes: 24 },
  { pattern: /phone/i, averageBytes: 14 },
  { pattern: /name/i, averageBytes: 20 }, // first_name, last_name, company_name, ...
  { pattern: /(code|slug|key|sku|status|type)/i, averageBytes: 12 },
];

/** Used when a column's name matches none of the heuristics above. */
const DEFAULT_UNBOUNDED_TEXT_BYTES = 50;

/** `json`/`jsonb` bodies vary enormously; this is a single flat guess. */
const JSON_AVERAGE_BYTES = 200;

function _estimateUnboundedTextBytes(columnName: string): number {
  const match = NAMED_TEXT_HEURISTICS.find((heuristic) => {
    return heuristic.pattern.test(columnName);
  });
  return match?.averageBytes ?? DEFAULT_UNBOUNDED_TEXT_BYTES;
}

/**
 * Estimates one column's average CSV-serialized width in bytes, from its
 * declared type alone - never reads a row. A fixed-width `character(n)` is
 * always padded to `n`, so it uses `n` directly. A `character varying(n)`
 * only bounds its values: `varchar(255)` is a common framework default whose
 * values are usually far shorter, so it uses the name-based heuristics below,
 * capped at `n`. Everything else without a fixed width falls to those
 * heuristics too.
 */
function _estimateColumnCsvBytes(column: ColumnSizeInfo): number {
  const { dataType, characterMaximumLength, columnName } = column;

  if (characterMaximumLength !== null) {
    return dataType === "character" ?
        characterMaximumLength
      : Math.min(
          characterMaximumLength,
          _estimateUnboundedTextBytes(columnName),
        );
  }

  if (dataType === "json" || dataType === "jsonb") {
    return JSON_AVERAGE_BYTES;
  }

  if (dataType === "text" || dataType === "character varying") {
    return _estimateUnboundedTextBytes(columnName);
  }

  return (
    FIXED_WIDTH_CSV_BYTES[dataType] ?? _estimateUnboundedTextBytes(columnName)
  );
}

/**
 * Estimates one row's total CSV width: every column's width, plus the
 * comma between each pair of columns and the `\r\n` `rowsToCsv` actually
 * writes (never a bare `\n`).
 */
function _estimateRowCsvBytes(columns: readonly ColumnSizeInfo[]): number {
  const columnBytes = columns.reduce((total, column) => {
    return total + _estimateColumnCsvBytes(column);
  }, 0);
  const commaCount = Math.max(columns.length - 1, 0);
  const rowTerminatorBytes = 2; // "\r\n"
  return columnBytes + commaCount + rowTerminatorBytes;
}

/**
 * Estimates a relation's total CSV byte size from its column types and
 * actual row count, with no row ever read. The row count is exact
 * (`count(*)`); the per-row width is the estimate - this product is only as
 * reliable as that estimate, which is why `getRelationRows` still checks the
 * real byte count once the CSV is actually built.
 */
function _estimateRelationCsvBytes(
  options: Readonly<{
    columns: readonly ColumnSizeInfo[];
    rowCount: number;
  }>,
): number {
  return _estimateRowCsvBytes(options.columns) * options.rowCount;
}

/**
 * Derives a row cap from the shared byte budget and a relation's own
 * estimated row width, rather than one flat row number for every table
 * regardless of how wide its rows are. `"unbounded"` when no row-width
 * estimate is available (or it is zero/negative) - `maxBytesPerCall` alone
 * still binds in that case, per `RelationCallCap`'s both-apply,
 * defer-when-unknown contract (`RelationCapabilities.types.ts`).
 *
 * The one `RelationCallCap` function both runtimes that need a Postgres row
 * cap import by reference: `createPostgresConnector.ts`'s `getRelationRows`
 * passes it `estimateRowCsvBytes`'s own output as `estimatedRowBytes`, so the
 * same per-column-type estimate this module already computes also drives the
 * row axis of `isWithinRelationCallCaps`, not a second, separately-chosen
 * number; `PostgresTableWrapper.ts`'s capability record uses it to advertise
 * the same derivation to the mediator.
 */
function _postgresMaxRowsPerCall(
  descriptor: RelationRowDescriptor,
): number | "unbounded" {
  if (
    descriptor.estimatedRowBytes === undefined ||
    descriptor.estimatedRowBytes <= 0
  ) {
    return "unbounded";
  }
  return Math.floor(
    POSTGRES_MAX_BYTES_PER_ACQUIRE / descriptor.estimatedRowBytes,
  );
}

/** Estimates a Postgres relation's CSV footprint from its column types. */
export const PostgresCsvEstimate = {
  estimateColumnCsvBytes: _estimateColumnCsvBytes,
  estimateRowCsvBytes: _estimateRowCsvBytes,
  estimateRelationCsvBytes: _estimateRelationCsvBytes,
  postgresMaxRowsPerCall: _postgresMaxRowsPerCall,
};
