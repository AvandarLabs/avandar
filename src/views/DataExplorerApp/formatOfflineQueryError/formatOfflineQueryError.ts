/** Shown when an offline query hits uncached dataset data. */
const OFFLINE_UNCACHED_MESSAGE =
  "This dataset's data isn't cached on this device. Connect to the internet, open the dataset, then try again.";

/**
 * When offline and a query fails (typically missing local parquet), return a
 * user-facing message instead of the raw DuckDB error.
 */
export function formatOfflineQueryError(error: unknown): string | undefined {
  if (navigator.onLine) {
    return undefined;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.length === 0) {
    return OFFLINE_UNCACHED_MESSAGE;
  }

  return OFFLINE_UNCACHED_MESSAGE;
}

export { OFFLINE_UNCACHED_MESSAGE };
