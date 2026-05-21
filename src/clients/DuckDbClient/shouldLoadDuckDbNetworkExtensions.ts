/**
 * Whether DuckDB-WASM should `LOAD` spatial / excel
 * from `extensions.duckdb.org` during client startup.
 */
export function shouldLoadDuckDbNetworkExtensions(options: {
  isDisableDuckDbSpatialFlagEnabled: boolean;
  /**
   * True when `selectBundle` returned a `pthreadWorker` (should not
   * happen).
   */
  hasPthreadWorker: boolean;
}): boolean {
  if (options.isDisableDuckDbSpatialFlagEnabled) {
    return false;
  }
  if (options.hasPthreadWorker) {
    return false;
  }
  return true;
}
