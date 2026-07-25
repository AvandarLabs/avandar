const DUCKDB_EMPTY_TOKEN = "(empty)";

/**
 * DuckDB uses `(empty)` in sniff/reject metadata for disabled options.
 */
export function isDuckDbEmptyToken(value: string | null | undefined): boolean {
  if (value == null) {
    return true;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed === DUCKDB_EMPTY_TOKEN;
}

/**
 * Normalizes UI / sniff tokens to `undefined` when the option is disabled.
 */
export function normalizeDuckDbCsvOptionToken(
  value: string | null | undefined,
): string | undefined {
  if (value == null || isDuckDbEmptyToken(value)) {
    return undefined;
  }

  return value;
}

/**
 * Converts sniff / user newline values into DuckDB `new_line` literals.
 * Actual control characters (LF/CR) must not be embedded in SQL strings.
 */
export function normalizeNewlineDelimiterForDuckDb(
  value: string | null | undefined,
): string | undefined {
  if (value == null) {
    return undefined;
  }

  // Check control characters before `trim()`: `"\n".trim()` is empty.
  if (value === "\r\n") {
    return "\\r\\n";
  }

  if (value === "\n") {
    return "\\n";
  }

  if (value === "\r") {
    return "\\r";
  }

  if (isDuckDbEmptyToken(value)) {
    return undefined;
  }

  if (value === "\\r\\n" || value === "\\n" || value === "\\r") {
    return value;
  }

  if (value.includes("\r\n")) {
    return "\\r\\n";
  }

  if (value.includes("\n")) {
    return "\\n";
  }

  if (value.includes("\r")) {
    return "\\r";
  }

  return value.length > 0 ? value : undefined;
}

/**
 * Returns a trimmed format string or `undefined` when absent (SQL NULL-safe).
 */
export function optionalTrimmedCsvFormat(
  value: string | null | undefined,
): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === DUCKDB_EMPTY_TOKEN) {
    return undefined;
  }

  return trimmed;
}
