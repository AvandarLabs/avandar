export const OFFLINE_UNCACHED_MESSAGE =
  "This dataset's data isn't cached on this device. Connect to the internet, open the dataset, then try again.";

/**
 * When offline and a query fails (typically missing local parquet), return a
 * user-facing message instead of the raw DuckDB error. Returns `undefined`
 * when online so callers fall back to the original error.
 */
export function formatOfflineQueryError(): string | undefined {
  return navigator.onLine ? undefined : OFFLINE_UNCACHED_MESSAGE;
}
