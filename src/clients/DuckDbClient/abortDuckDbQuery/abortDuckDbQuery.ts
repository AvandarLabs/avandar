type CancellableDuckDbConnection = {
  cancelSent: () => unknown;
};

/** Registers one AbortSignal to cancel the active DuckDB query. */
export function abortDuckDbQuery(options: {
  signal: AbortSignal;
  connection: CancellableDuckDbConnection;
}): () => void {
  options.signal.throwIfAborted();
  const onAbort = (): void => {
    void options.connection.cancelSent();
  };
  options.signal.addEventListener("abort", onAbort, { once: true });
  return () => {
    options.signal.removeEventListener("abort", onAbort);
  };
}
