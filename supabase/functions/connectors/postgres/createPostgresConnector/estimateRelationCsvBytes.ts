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
  { pattern: /(description|notes?|comment|summary|bio|remarks)/i, averageBytes: 280 },
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
 * declared type alone - never reads a row. A `character`/`character varying`
 * column with a declared `(n)` uses `n` directly, since that is an exact
 * bound, not a guess; everything else without a fixed width falls to the
 * name-based heuristics above.
 */
export function estimateColumnCsvBytes(column: ColumnSizeInfo): number {
  const { dataType, characterMaximumLength, columnName } = column;

  if (characterMaximumLength !== null) {
    return characterMaximumLength;
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
export function estimateRowCsvBytes(
  columns: readonly ColumnSizeInfo[],
): number {
  const columnBytes = columns.reduce((total, column) => {
    return total + estimateColumnCsvBytes(column);
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
export function estimateRelationCsvBytes(
  options: Readonly<{
    columns: readonly ColumnSizeInfo[];
    rowCount: number;
  }>,
): number {
  return estimateRowCsvBytes(options.columns) * options.rowCount;
}
