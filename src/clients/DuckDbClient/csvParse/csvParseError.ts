/**
 * True when a caught error looks like a DuckDB CSV parse/type error that a
 * retry with adjusted parse options could plausibly fix, rather than a fatal
 * failure.
 *
 * "Recoverable" means the failure came from how the CSV was interpreted (a
 * mis-detected delimiter/quote, or a column cast that rejected the data),
 * not from something a re-parse cannot change (a missing file, a network
 * error, an out-of-memory abort). The import pipeline uses this to decide
 * whether to re-run with refined options (enable quotes, relax strict
 * casting, drop sniffed column types) instead of surfacing the error.
 *
 * Detection is message-based because DuckDB-WASM raises these as plain
 * `Error`s with no structured error code to match on.
 */
export function isRecoverableCsvParseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("CSV Error") ||
    message.includes("Could not convert string") ||
    message.includes("convert column")
  );
}
